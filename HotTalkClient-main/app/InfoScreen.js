import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { termsTexts } from './TextConstants'; // TextConstants.js 파일에서 import
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { getMessaging, unsubscribeFromTopic } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import Constants from 'expo-constants';
const { width } = Dimensions.get('window');
import * as SecureStore from 'expo-secure-store';



export default function InfoScreen() {
  const navigation = useNavigation();
  const [selectedMenu, setSelectedMenu] = useState('guide');
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const API_URL = Constants.expoConfig.extra.API_URL;
  //const API_URL = "http://192.168.0.2:5000";
  const menuItems = [
    { key: 'guide', label: '이용안내', content: termsTexts.usageGuide },
    { key: 'terms', label: '이용약관', content: termsTexts.termsOfService },
    {
      key: 'locationTerms',
      label: '위치기반 서비스 이용약관',
      content: termsTexts.locationTerms,
    },
    {
      key: 'privacyPolicy',
      label: '개인정보 처리방침',
      content: termsTexts.privacyPolicy,
    },
    {
      key: 'withdraw',
      label: '탈퇴하기',
      content: '',
    },
  ];


  const app = getApp(); // 기본 Firebase 앱 인스턴스
  const messagingInstance = getMessaging(app);

  const getDeviceUUID = async () => {
    return DeviceInfo.getUniqueId(); // 고유한 기기 ID 반환
  };

async function testSecureStore() {
  try {

    console.log("🔹 데이터 가져오는 중...");
    const value = await SecureStore.getItemAsync('deviceUuid');
    console.log('📢 저장된 값:', value);
    
    if (value === null) {
      console.log("⚠️ 저장된 값이 null입니다.");
      console.log("🔹 데이터 저장 시작...");
      const deviceUUID = await getDeviceUUID(); // 디바이스 UUID 가져오기
      await SecureStore.setItemAsync('deviceUuid', deviceUUID, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      console.log("✅ 새로 데이터 저장 완료");
      const value = await SecureStore.getItemAsync('deviceUuid');
      console.log('새로 저장된 값:', value);
      return value;
    } else {
      return value;
    }
  } catch (error) {
    console.log('❌ SecureStore 테스트 중 오류:', error);
  }
}
  
    useEffect(() => {
      (async () => {
        //await saveData();
        //await getData();
        await testSecureStore();
      })();
    }, []);



  const renderContent = () => {
    const selectedItem = menuItems.find((item) => item.key === selectedMenu);
    return selectedItem ? selectedItem.content : '';
  };

  const handleWithdrawPress = () => {
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };


  const handleConfirmWithdraw = async () => {
    try {
      console.log('탈퇴버튼 눌림');
      setModalVisible(false);

      let deviceUUID; // 변수 선언

      if(Platform.OS === 'android'){
        deviceUUID = await getDeviceUUID(); // 디바이스 UUID 가져오기
      } else if(Platform.OS === 'ios') {
        deviceUUID = await testSecureStore();
        //console.log("ios UUID:", deviceUUID);
      }



      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      const response = await fetch(`${API_URL}/api/users/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ UUID: deviceUUID }), // 본문 데이터를 JSON 문자열로 변환
      });


      if (response.ok) {
        const data = await response.json();

 
        // ✅ 단일 문자열만 전달해야 함
        //const topic = `user-${data}`;

        // 여기서 topic unsubscribe
        const joinedMeetingIds = data.joinedMeetingIds || [];
        const createdMeetingIds = data.createdMeetingIds || [];

      // ✅ 중복 방지를 위해 Set으로 합치기 (선택사항)
      const allMeetingIds = Array.from(new Set([
        ...joinedMeetingIds,
        ...createdMeetingIds,
      ]));

      // ✅ for...of + await 사용
      for (const id of allMeetingIds) {
        const topic = `meeting_${id}`;     // 여기서 뒤에 userId 안 붙음
        await messagingInstance.unsubscribeFromTopic(topic);
        console.log(`Unsubscribed from topic: ${topic}`);
      }
        //console.log(`Unsubscribed from topic: ${topic}`);

        await AsyncStorage.clear();
        await EncryptedStorage.removeItem('userToken');

      //계정 삭제된 시간 AsyncStorage등 로컬 저장소에 저장(재가입 딜레이를 위해서)
      // ✅ 탈퇴 완료 후 알림 띄우고 앱 종료
        Alert.alert(
          "회원탈퇴 완료",
          "썸톡에서 탈퇴 되었습니다.",
          [
            {
              text: "확인",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'index' }],
                });
              }
            }
          ],
          { cancelable: false }
        );



      } else if(response.status === 401){
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        const errorData = await response.json();
        Alert.alert('실패', errorData.message || '회원탈퇴에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원탈퇴 오류:', error);
      Alert.alert('오류', '회원탈퇴에 실패했습니다.');
    } finally {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'index' }],
        })
      );
    }


  };

  const handleCancelWithdraw = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  return (
    <View style={styles.container}>
      {/* 메뉴 */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.menuItem,
              selectedMenu === item.key && styles.menuItemSelected,
            ]}
            onPress={() => {
              if (item.key === 'withdraw') {
                handleWithdrawPress();
              } else {
                setSelectedMenu(item.key);
              }
            }}
          >
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 내용 */}
      {selectedMenu !== 'withdraw' && (
        <ScrollView style={styles.contentContainer}>
          <Text style={styles.contentText}>{renderContent()}</Text>
        </ScrollView>
      )}

      {/* 탈퇴 확인 모달 */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
            <Text style={styles.modalTitle}>회원탈퇴</Text>
            <Text style={styles.modalText}>정말 탈퇴하시겠습니까?</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelWithdraw}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmWithdraw}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  menuItem: {
    width: width / 2 - 20,
    paddingVertical: 7,
    marginHorizontal: 3,
    marginBottom: 5,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#888',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemSelected: {
    backgroundColor: '#E7E7E7',
    borderColor: '#888',
  },
  menuText: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(59, 59, 59, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#D6D6D6',
    marginRight: 5,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#D6D6D6',
    marginLeft: 5,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 14,
    textAlign: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 14,
    textAlign: 'center',
  },
});
