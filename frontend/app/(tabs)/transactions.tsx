import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Transaction {
  id: string;
  from_user: string;
  from_user_name: string;
  to_user: string;
  to_user_name: string;
  amount: number;
  note: string;
  type: string;
  status: string;
  timestamp: string;
}

export default function TransactionsScreen() {
  const { token, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transaction/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send':
        return 'arrow-up-circle';
      case 'receive':
        return 'arrow-down-circle';
      case 'topup':
        return 'add-circle';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'send':
        return '#FF3B30';
      case 'receive':
        return '#06CD92';
      case 'topup':
        return '#06CD92';
      default:
        return '#A0A0A0';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isPositive = item.type === 'receive' || item.type === 'topup';
    const displayName =
      item.type === 'topup'
        ? 'VeloraPay'
        : item.type === 'send'
        ? item.to_user_name
        : item.from_user_name;

    return (
      <TouchableOpacity style={styles.transactionCard}>
        <View style={[styles.iconContainer, { backgroundColor: `${getTransactionColor(item.type)}20` }]}>
          <Ionicons name={getTransactionIcon(item.type)} size={24} color={getTransactionColor(item.type)} />
        </View>
        <View style={styles.transactionContent}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionName}>{displayName}</Text>
            <Text style={[styles.transactionAmount, { color: getTransactionColor(item.type) }]}>
              {isPositive ? '+' : '-'}${item.amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.transactionFooter}>
            <Text style={styles.transactionType}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
            <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
          </View>
          {item.note && <Text style={styles.transactionNote}>{item.note}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#333" />
      <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyStateText}>Your transaction history will appear here</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06CD92" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>{transactions.length} transactions</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, transactions.length === 0 && styles.emptyListContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06CD92" />}
        ListEmptyComponent={EmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
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
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 12,
    color: '#A0A0A0',
    textTransform: 'capitalize',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionNote: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#A0A0A0',
    textAlign: 'center',
  },
});
