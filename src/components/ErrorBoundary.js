import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    if (typeof console !== 'undefined' && console.error) {
      console.error('[Kharcha render crash]', error, info?.componentStack);
    }
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error);
    const stack = this.state.info?.componentStack?.split('\n').slice(0, 8).join('\n') || '';

    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Something broke.</Text>
          <Text style={styles.lede}>
            The screen failed to render. Tap Reset to try again, or sign out from Settings.
          </Text>
          <View style={styles.card}>
            <Text style={styles.label}>Error</Text>
            <Text style={styles.code}>{msg}</Text>
            {stack ? (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>Component stack</Text>
                <Text style={styles.code}>{stack}</Text>
              </>
            ) : null}
          </View>
          <Pressable onPress={this.reset} style={({ pressed }) => [styles.btn, pressed && styles.btnActive]}>
            <Text style={styles.btnText}>Reset</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 24, paddingTop: 80 },
  title: { fontFamily: fonts.serifMediumItalic, fontSize: 32, color: colors.ink, marginBottom: 8 },
  lede: { fontFamily: fonts.serifItalic || fonts.serifMediumItalic, fontSize: 15, color: colors.inkSoft, marginBottom: 22, lineHeight: 22 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: 16,
    borderRadius: 2,
    marginBottom: 18,
  },
  label: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.inkSoft, marginBottom: 6 },
  code: { fontFamily: fonts.mono, fontSize: 12, color: colors.ink, lineHeight: 18 },
  btn: { backgroundColor: colors.ink, paddingVertical: 14, alignItems: 'center', borderRadius: 2 },
  btnActive: { opacity: 0.85 },
  btnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.bg, letterSpacing: 0.4 },
});
