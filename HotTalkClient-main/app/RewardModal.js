import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';


const RewardModal = ({ visible, onClose, navigation }) => {

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="false"
      onRequestClose={onClose}
    >
      <View style={styles.rewardModalOverlay}>
        <View style={styles.rewardModalContainer}>
          <Text style={styles.rewardModalTitle}>🎉이벤트🎉</Text>
          <Text style={styles.rewardModalMessage}>
            게시글을 작성할때마다 하루 5번까지 캔디 3개를 드립니다😍😍
          </Text>
					<View style={styles.rewardModalButtonContainer}>
						<TouchableOpacity style={styles.rewardModalButtonCancel} onPress={onClose}>
            <Text style={styles.rewardModalButtonCancelText}>닫기</Text>
          </TouchableOpacity>
					<TouchableOpacity style={styles.rewardModalButtonWrite} onPress={() => {
						onClose();
						navigation.navigate('WriteScreen')}}>
            <Text style={styles.rewardModalButtonWriteText}>글작성</Text>
          </TouchableOpacity>
					</View>
        </View>
      </View>
    </Modal>
  );
};

export default RewardModal;

const styles = StyleSheet.create({
	rewardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // 어둡게 덮어서 모달 강조
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardModalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5, // 안드로이드 그림자 효과
    shadowColor: '#000', // iOS 그림자 효과
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rewardModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  rewardModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
	rewardModalButtonContainer: {
    flexDirection: 'row',
	},
  rewardModalButtonCancel: {
    //backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
		marginHorizontal: 20,
		backgroundColor:'#EBEBEB',
  },
	rewardModalButtonWrite: {
    //backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
		marginHorizontal: 20,
		backgroundColor:'#FF7890',
  },
  rewardModalButtonCancelText: {
    color: '#000',
    fontSize: 16,
  },
	rewardModalButtonWriteText: {
    color: '#fff',
    fontSize: 16,
  },
});
