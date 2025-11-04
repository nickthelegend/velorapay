import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, Camera } from 'expo-camera';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export default function ScanQRScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);
    
    // Parse QR code data (expecting format: velorapay://pay?username=johndoe&amount=100)
    try {
      const url = new URL(data);
      
      if (url.protocol === 'velorapay:') {
        const username = url.searchParams.get('username');
        const amount = url.searchParams.get('amount');
        
        if (username) {
          Alert.alert(
            'QR Code Scanned',
            `Send ${amount ? `$${amount}` : 'money'} to @${username}?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => setScanned(false),
              },
              {
                text: 'Send',
                onPress: () => {
                  // Navigate to send screen with pre-filled data
                  router.push({
                    pathname: '/send',
                    params: { username, amount: amount || '' },
                  });
                },
              },
            ]
          );
        } else {
          Alert.alert('Invalid QR Code', 'This QR code does not contain valid payment information.');
          setScanned(false);
        }
      } else {
        Alert.alert('Invalid QR Code', 'This is not a VeloraPay payment QR code.');
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Unable to process this QR code.');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#06CD92" />
          <Text style={styles.messageText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Code</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="camera-off" size={64} color="#666" />
          <Text style={styles.messageText}>Camera permission denied</Text>
          <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan QR Code</Text>
        <TouchableOpacity style={styles.torchButton} onPress={() => setTorchOn(!torchOn)}>
          <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            {/* Top overlay */}
            <View style={styles.overlaySection} />
            
            {/* Middle section with scan area */}
            <View style={styles.middleSection}>
              <View style={styles.overlaySection} />
              <View style={styles.scanArea}>
                {/* Corner indicators */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <View style={styles.overlaySection} />
            </View>
            
            {/* Bottom overlay */}
            <View style={styles.overlaySection} />
          </View>
        </CameraView>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Position QR Code</Text>
        <Text style={styles.instructionsText}>
          Align the QR code within the frame to scan
        </Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="qr-code" size={24} color="#06CD92" />
            <Text style={styles.featureText}>VeloraPay QR Codes</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="flash" size={24} color="#06CD92" />
            <Text style={styles.featureText}>Instant Payments</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#06CD92',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 24,
    marginHorizontal: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleSection: {
    flexDirection: 'row',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#06CD92',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  instructionsContainer: {
    padding: 24,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feature: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 8,
  },
});
