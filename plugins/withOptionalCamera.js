// CAMERA permission makes Play assume a camera is required and hides the app from
// Chromebooks/tablets without one. Scanning also works from the gallery, so mark it optional.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withOptionalCamera(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const names = ['android.hardware.camera', 'android.hardware.camera.autofocus'];
    manifest['uses-feature'] = (manifest['uses-feature'] || []).filter((f) => !names.includes(f.$?.['android:name']));
    for (const name of names) manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
    return c;
  });
};
