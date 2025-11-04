import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SendScreen() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const [recipientUsername, setRecipientUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<any>(null);

  const searchRecipient = async () => {
    if (!recipientUsername.trim()) {
      setRecipientInfo(null);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user/search/${recipientUsername}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecipientInfo(data);
      } else {
        setRecipientInfo(null);
      }
    } catch (error) {
      setRecipientInfo(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSend = async () => {
    const amountValue = parseFloat(amount);

    if (!recipientUsername.trim()) {
      Alert.alert('Error', 'Please enter a recipient username');
      return;
    }

    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amountValue > (user?.wallet_balance || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/transaction/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_username: recipientUsername,
          amount: amountValue,
          note: note.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Transaction failed');
      }

      Alert.alert('Success', data.message, [
        {
          text: 'OK',
          onPress: () => {
            setRecipientUsername('');
            setAmount('');
            setNote('');
            setRecipientInfo(null);
            refreshUser();
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send money');
    } finally {
      setLoading(false);
    }
  };

  const usdToInr = (usd: number) => {
    return (usd * 83.2).toFixed(2);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header with Back Button */}
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Send Money</Text>
              <Text style={styles.subtitle}>Transfer USDC to another user</Text>
            </View>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{user?.wallet_balance.toFixed(2)} USDC</Text>
            <Text style={styles.balanceSubtext}>≈ ₹ {usdToInr(user?.wallet_balance || 0)}</Text>
          </View>

          {/* Recipient Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Recipient Username</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.input}
                value={recipientUsername}
                onChangeText={(text) => {
                  setRecipientUsername(text);
                  setRecipientInfo(null);
                }}
                placeholder="Enter username"
                placeholderTextColor="#666"
                autoCapitalize="none"
                editable={!loading}
                onBlur={searchRecipient}
              />
              {searchLoading && (
                <ActivityIndicator
                  style={styles.searchIcon}
                  size="small"
                  color="#06CD92"
                />
              )}
              {!searchLoading && recipientInfo && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#06CD92"
                  style={styles.searchIcon}
                />
              )}
            </View>
            {recipientInfo && (
              <View style={styles.recipientCard}>
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientAvatarText}>
                    {recipientInfo.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>{recipientInfo.full_name}</Text>
                  <Text style={styles.recipientUsername}>@{recipientInfo.username}</Text>
                  <View style={styles.reputationBadge}>
                    <Ionicons name="star" size={12} color="#06CD92" />
                    <Text style={styles.reputationText}>
                      {recipientInfo.reputation_score.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Amount (USDC)</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              editable={!loading}
            />
            {amount && (
              <Text style={styles.amountSubtext}>≈ ₹ {usdToInr(parseFloat(amount) || 0)}</Text>
            )}
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {[50, 100, 500, 1000].map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setAmount(quickAmount.toString())}
                disabled={loading}
              >
                <Text style={styles.quickAmountText}>${quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#000" />
                <Text style={styles.sendButtonText}>Send Money</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  balanceCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06CD92',
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  searchContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#06CD92',
  },
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06CD92',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recipientAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  recipientUsername: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 2,
  },
  reputationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  reputationText: {
    fontSize: 12,
    color: '#06CD92',
    fontWeight: '600',
  },
  amountInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  amountSubtext: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 8,
    textAlign: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#06CD92',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickAmountText: {
    color: '#06CD92',
    fontSize: 14,
    fontWeight: '600',
  },
  noteInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#06CD92',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#06CD92',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
