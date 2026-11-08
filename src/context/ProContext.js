import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  endConnection, fetchProducts, finishTransaction, getAvailablePurchases, initConnection,
  purchaseErrorListener, purchaseUpdatedListener, requestPurchase,
} from 'expo-iap';

export const PRO_SKU = 'kharcha_pro';

const ProContext = createContext({ pro: false, token: null, plans: [], ready: false });

const isPro = (p) => p?.productId === PRO_SKU && p.purchaseState === 'purchased';

/** One entry per base plan: the trial offer if Play says the user is eligible, else the plain plan. */
function toPlans(product) {
  const byPlan = new Map();
  for (const o of product?.subscriptionOffers || []) {
    const phases = o.pricingPhasesAndroid?.pricingPhaseList || [];
    const recurring = phases.at(-1);
    if (!o.offerTokenAndroid || !recurring) continue;
    const trial = phases.length > 1 && phases[0].priceAmountMicros === '0';
    const plan = {
      id: o.basePlanIdAndroid || o.id,
      offerToken: o.offerTokenAndroid,
      price: recurring.formattedPrice,
      period: recurring.billingPeriod, // ISO 8601: P1M, P1Y
      trialDays: trial ? Number(phases[0].billingPeriod.match(/P(\d+)D/)?.[1] || 7) : 0,
    };
    const prev = byPlan.get(plan.id);
    if (!prev || plan.trialDays > prev.trialDays) byPlan.set(plan.id, plan);
  }
  // Yearly first: it's the better deal.
  return [...byPlan.values()].sort((a, b) => (b.period === 'P1Y') - (a.period === 'P1Y'));
}

/**
 * Kharcha Pro via Google Play Billing. The purchase token is passed to the
 * scan server, which verifies it with Google; this context only drives the UI.
 */
export function ProProvider({ children }) {
  const [state, setState] = useState({ pro: false, token: null, plans: [], ready: false, error: null });
  const waiters = useRef([]);

  const refresh = useCallback(async () => {
    try {
      const owned = (await getAvailablePurchases()).find(isPro);
      setState((s) => ({ ...s, pro: !!owned, token: owned?.purchaseToken ?? null }));
      return !!owned;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const subs = [
      purchaseUpdatedListener(async (purchase) => {
        if (!isPro(purchase)) return;
        // Unacknowledged subscriptions are refunded by Play after 3 days.
        try { await finishTransaction({ purchase, isConsumable: false }); } catch {}
        setState((s) => ({ ...s, pro: true, token: purchase.purchaseToken ?? s.token }));
        waiters.current.splice(0).forEach((w) => w.resolve(true));
      }),
      purchaseErrorListener((err) => {
        waiters.current.splice(0).forEach((w) => (err.code === 'user-cancelled' ? w.resolve(false) : w.reject(err)));
      }),
    ];
    (async () => {
      try {
        await initConnection();
        await refresh();
        const products = await fetchProducts({ skus: [PRO_SKU], type: 'subs' });
        if (alive) setState((s) => ({ ...s, plans: toPlans(products?.[0]), ready: true }));
      } catch (e) {
        if (alive) setState((s) => ({ ...s, ready: true, error: e?.message || 'Google Play isn’t available.' }));
      }
    })();
    return () => {
      alive = false;
      subs.forEach((s) => s.remove());
      endConnection().catch(() => {});
    };
  }, [refresh]);

  /** Opens Play's purchase sheet. Resolves true when bought, false when cancelled. */
  const buy = useCallback((plan) => new Promise((resolve, reject) => {
    waiters.current.push({ resolve, reject });
    requestPurchase({
      type: 'subs',
      request: { google: { skus: [PRO_SKU], subscriptionOffers: [{ sku: PRO_SKU, offerToken: plan.offerToken }] } },
    }).catch((e) => {
      waiters.current = waiters.current.filter((w) => w.resolve !== resolve);
      reject(e);
    });
  }), []);

  return (
    <ProContext.Provider value={{ ...state, buy, restore: refresh }}>
      {children}
    </ProContext.Provider>
  );
}

export const usePro = () => useContext(ProContext);
