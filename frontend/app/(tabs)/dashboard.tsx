import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function DashboardScreen() {
  const { user, token, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Top-up failed');
      }

      Alert.alert('Success', data.message);
      setShowTopUpModal(false);
      setTopUpAmount('');
      await refreshUser();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to top up wallet');
    } finally {
      setLoading(false);
    }
  };

  const usdToInr = (usd: number) => {
    return (usd * 83.2).toFixed(2);  // Mock exchange rate
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#06CD92"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.userName}>{user?.full_name}</Text>
          </View>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>VP</Text>
          </View>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletLabel}>USDC Balance</Text>
              <Text style={styles.walletBalance}>{user?.wallet_balance.toFixed(2)} USDC</Text>
              <Text style={styles.walletSubtext}>≈ ₹ {usdToInr(user?.wallet_balance || 0)}</Text>
            </View>
            <TouchableOpacity style={styles.topUpButton} onPress={() => setShowTopUpModal(true)}>
              <Ionicons name="add-circle" size={24} color="#000" />
              <Text style={styles.topUpButtonText}>Top-Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reputation Card */}
        <View style={styles.reputationCard}>
          <View style={styles.reputationHeader}>
            <Ionicons name="star" size={24} color="#06CD92" />
            <Text style={styles.reputationTitle}>Reputation Score</Text>
          </View>
          <Text style={styles.reputationScore}>{user?.reputation_score.toFixed(1)}/100</Text>
          <View style={styles.reputationBarContainer}>
            <View style={[styles.reputationBar, { width: `${user?.reputation_score || 0}%` }]} />
          </View>
          <Text style={styles.reputationSubtext}>
            {user?.reputation_score && user.reputation_score >= 80
              ? 'Excellent standing!'
              : user?.reputation_score && user.reputation_score >= 60
              ? 'Good reputation'
              : 'Keep building your reputation'}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="arrow-up" size={28} color="#06CD92" />
              </View>
              <Text style={styles.actionText}>Send Money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="arrow-down" size={28} color="#06CD92" />
              </View>
              <Text style={styles.actionText}>Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="swap-horizontal" size={28} color="#06CD92" />
              </View>
              <Text style={styles.actionText}>Exchange</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="qr-code" size={28} color="#06CD92" />
              </View>
              <Text style={styles.actionText}>Scan QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Top-Up Modal */}
      <Modal
        visible={showTopUpModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top-Up Wallet</Text>
              <TouchableOpacity onPress={() => setShowTopUpModal(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Amount (USDC)</Text>
            <TextInput
              style={styles.modalInput}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              placeholder="Enter amount"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              editable={!loading}
            />

            <View style={styles.quickAmounts}>
              {[100, 500, 1000, 5000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setTopUpAmount(amount.toString())}
                  disabled={loading}
                >
                  <Text style={styles.quickAmountText}>${amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalButton, loading && styles.buttonDisabled]}
              onPress={handleTopUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.modalButtonText}>Confirm Top-Up</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 4,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06CD92',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  walletCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#06CD92',
    marginBottom: 16,
    shadowColor: '#06CD92',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  walletSubtext: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 4,
  },
  topUpButton: {
    backgroundColor: '#06CD92',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  topUpButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  reputationCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  reputationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reputationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  reputationScore: {
    fontSize: 28,
    fontWeight: '700',
    color: '#06CD92',
    marginBottom: 12,
  },
  reputationBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  reputationBar: {
    height: '100%',
    backgroundColor: '#06CD92',
  },
  reputationSubtext: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(6, 205, 146, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  modalLabel: {
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
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
  modalButton: {
    backgroundColor: '#06CD92',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
