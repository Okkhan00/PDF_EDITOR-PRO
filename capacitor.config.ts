import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aizaz.pdfeditpro',
  appName: 'PdfEdit Pro',
  webDir: 'www',
  android: {
    // Keeps content out from under the status/navigation bars on Android 15+.
    adjustMarginsForEdgeToEdge: 'auto',
    allowMixedContent: false
  },
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      launchAutoHide: true,
      backgroundColor: '#f4f1ec',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE'
    }
  }
};

export default config;
