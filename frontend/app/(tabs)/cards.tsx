import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

interface Card {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  balance: number;
  type: 'virtual' | 'physical';
  status: 'active' | 'blocked' | 'frozen';
}

export default function CardsScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([
    {
      id: '1',
      cardNumber: '4532 1234 5678 9012',
      cardHolder: user?.full_name || 'Card Holder',
      expiryDate: '12/25',
      cvv: '123',
      balance: 5000.00,
      type: 'virtual',
      status: 'active',
    },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cardType, setCardType] = useState<'virtual' | 'physical'>('virtual');
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);

  const handleCreateCard = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const newCard: Card = {
        id: Date.now().toString(),
        cardNumber: `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        cardHolder: user?.full_name || 'Card Holder',
        expiryDate: '12/27',
        cvv: Math.floor(100 + Math.random() * 900).toString(),
        balance: 0,
        type: cardType,
        status: 'active',
      };
      
      setCards([...cards, newCard]);
      setLoading(false);
      setShowCreateModal(false);
      Alert.alert('Success', `${cardType === 'virtual' ? 'Virtual' : 'Physical'} card created successfully!`);
    }, 1500);
  };

  const handleCardAction = (card: Card, action: 'freeze' | 'unfreeze' | 'block') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this card?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            const updatedCards = cards.map(c => {
              if (c.id === card.id) {
                return {
                  ...c,
                  status: action === 'freeze' ? 'frozen' : action === 'unfreeze' ? 'active' : 'blocked',
                };
              }
              return c;
            });
            setCards(updatedCards);
            Alert.alert('Success', `Card ${action}d successfully`);
          },
        },
      ]
    );
  };

  const renderCard = (card: Card) => {
    const maskedNumber = card.cardNumber.replace(/\d(?=\d{4})/g, '*');
    const gradientColors = card.type === 'virtual' 
      ? ['#06CD92', '#003C2F'] 
      : ['#1A1A1A', '#000000'];

    return (
      <TouchableOpacity
        key={card.id}
        style={styles.cardContainer}
        onPress={() => {
          setSelectedCard(card);
          setShowCardDetails(true);
        }}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTypeContainer}>
              <Ionicons 
                name={card.type === 'virtual' ? 'phone-portrait' : 'card'} 
                size={24} 
                color="#FFF" 
              />
              <Text style={styles.cardType}>
                {card.type === 'virtual' ? 'Virtual Card' : 'Physical Card'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: card.status === 'active' ? '#06CD92' : card.status === 'frozen' ? '#FFA500' : '#FF3B30' 
            }]}>
              <Text style={styles.statusText}>{card.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.cardChip}>
            <View style={styles.chip} />
          </View>

          <Text style={styles.cardNumber}>{maskedNumber}</Text>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>CARD HOLDER</Text>
              <Text style={styles.cardHolder}>{card.cardHolder.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardExpiry}>{card.expiryDate}</Text>
            </View>
          </View>

          <View style={styles.cardBalanceContainer}>
            <Text style={styles.cardBalanceLabel}>Balance</Text>
            <Text style={styles.cardBalance}>${card.balance.toFixed(2)}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cards</Text>
        <Text style={styles.subtitle}>{cards.length} card{cards.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cards.map(card => renderCard(card))}

        {/* Create New Card Button */}
        <TouchableOpacity
          style={styles.createCardButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle" size={32} color="#06CD92" />
          <Text style={styles.createCardText}>Create New Card</Text>
        </TouchableOpacity>

        {/* Card Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Card Benefits</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="shield-checkmark" size={24} color="#06CD92" />
            <Text style={styles.benefitText}>Secure contactless payments</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="globe" size={24} color="#06CD92" />
            <Text style={styles.benefitText}>Accepted worldwide</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="flash" size={24} color="#06CD92" />
            <Text style={styles.benefitText}>Instant virtual card creation</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="lock-closed" size={24} color="#06CD92" />
            <Text style={styles.benefitText}>Freeze/unfreeze anytime</Text>
          </View>
        </View>
      </ScrollView>

      {/* Create Card Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Card</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Select Card Type</Text>
            
            <View style={styles.cardTypeSelection}>
              <TouchableOpacity
                style={[styles.typeOption, cardType === 'virtual' && styles.typeOptionSelected]}
                onPress={() => setCardType('virtual')}
              >
                <Ionicons 
                  name="phone-portrait" 
                  size={32} 
                  color={cardType === 'virtual' ? '#06CD92' : '#666'} 
                />
                <Text style={[styles.typeOptionTitle, cardType === 'virtual' && styles.typeOptionTitleSelected]}>
                  Virtual Card
                </Text>
                <Text style={styles.typeOptionSubtitle}>Instant creation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOption, cardType === 'physical' && styles.typeOptionSelected]}
                onPress={() => setCardType('physical')}
              >
                <Ionicons 
                  name="card" 
                  size={32} 
                  color={cardType === 'physical' ? '#06CD92' : '#666'} 
                />
                <Text style={[styles.typeOptionTitle, cardType === 'physical' && styles.typeOptionTitleSelected]}>
                  Physical Card
                </Text>
                <Text style={styles.typeOptionSubtitle}>Delivered in 5-7 days</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardFeatures}>
              <Text style={styles.featuresTitle}>Features:</Text>
              <Text style={styles.featureItem}>✓ Contactless payments</Text>
              <Text style={styles.featureItem}>✓ Global acceptance</Text>
              <Text style={styles.featureItem}>✓ Real-time notifications</Text>
              <Text style={styles.featureItem}>✓ Easy freeze/unfreeze controls</Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreateCard}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.createButtonText}>Create {cardType === 'virtual' ? 'Virtual' : 'Physical'} Card</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Card Details Modal */}
      <Modal
        visible={showCardDetails}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCardDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Card Details</Text>
              <TouchableOpacity onPress={() => setShowCardDetails(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            {selectedCard && (
              <>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Card Number</Text>
                  <Text style={styles.detailValue}>{selectedCard.cardNumber}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>CVV</Text>
                  <Text style={styles.detailValue}>{selectedCard.cvv}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Expiry Date</Text>
                  <Text style={styles.detailValue}>{selectedCard.expiryDate}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Card Holder</Text>
                  <Text style={styles.detailValue}>{selectedCard.cardHolder}</Text>
                </View>

                <View style={styles.cardActions}>
                  {selectedCard.status === 'active' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCardAction(selectedCard, 'freeze')}
                    >
                      <Ionicons name="snow" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Freeze Card</Text>
                    </TouchableOpacity>
                  )}
                  {selectedCard.status === 'frozen' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCardAction(selectedCard, 'unfreeze')}
                    >
                      <Ionicons name="flame" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Unfreeze Card</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.blockButton]}
                    onPress={() => handleCardAction(selectedCard, 'block')}
                  >
                    <Ionicons name="ban" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Block Card</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    width: CARD_WIDTH,
    height: 220,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#06CD92',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardType: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  cardChip: {
    marginBottom: 20,
  },
  chip: {
    width: 40,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardHolder: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  cardExpiry: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  cardBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBalanceLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cardBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  createCardButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06CD92',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  createCardText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06CD92',
    marginTop: 12,
  },
  benefitsContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 500,
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
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 16,
  },
  cardTypeSelection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeOption: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  typeOptionSelected: {
    borderColor: '#06CD92',
    backgroundColor: 'rgba(6, 205, 146, 0.1)',
  },
  typeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  typeOptionTitleSelected: {
    color: '#06CD92',
  },
  typeOptionSubtitle: {
    fontSize: 11,
    color: '#666',
  },
  cardFeatures: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 13,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: '#06CD92',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  detailItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  cardActions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#06CD92',
    borderRadius: 12,
    padding: 16,
  },
  blockButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
