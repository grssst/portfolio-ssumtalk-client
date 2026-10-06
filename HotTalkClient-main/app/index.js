import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, AppRegistry, ImageBackground, StyleSheet, Dimensions, Platform, StatusBar, AppState } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation } from 'expo-router';
import Constants from 'expo-constants';
import { getMessaging, onMessage, setBackgroundMessageHandler, subscribeToTopic } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import DeviceInfo from 'react-native-device-info';

SplashScreen.preventAutoHideAsync(); // 스플래시 화면 유지
StatusBar.setHidden(true);
// 화면의 너비와 높이를 가져옵니다.
const { width, height } = Dimensions.get('window');



function HeadlessCheck({ isHeadless }) {
  if (isHeadless) {
    <AppFake />;
  }
  
  return (
    <App />
  );
}
const AppFake = () => {
  return null;
};
const App = () => {
return null;
};
AppRegistry.registerComponent('썸톡', () => HeadlessCheck);
export default function FirstScreen() {  //index.js 파일인데 함수이름을 FirstScreen으로 바꿔놨음.
  const [showMain, setShowMain] = useState(false); // 기존 화면 렌더링 여부
  const navigation = useNavigation();
  
  const API_URL = Constants.expoConfig.extra.API_URL;

  const app = getApp();
  const messagingInstance = getMessaging(app);



  useEffect(() => {
    // 알림 채널 생성
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#FF231F7C',
    }).then(() => {
      console.log('알림 채널 생성 완료');
    });
  }, []);




  // 백그라운드 메시지 핸들러 설정
  setBackgroundMessageHandler(messagingInstance, async remoteMessage => {
    console.log('백그라운드 메시지:', remoteMessage);
  

    // 제목과 메시지가 있는 경우에만 알림 생성
    const title = remoteMessage.data?.title;
    const body = remoteMessage.data?.body;

    if (body) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: 'default',  // iOS 기본 알림음 재생
          data: remoteMessage.data, // 전달받은 데이터 추가
        },
        trigger: null, // 즉시 알림을 트리거합니다.
      });

      // 🔹 iOS에서 현재 뱃지 숫자를 +1 증가
      if (Platform.OS === 'ios') {
        const currentBadgeCount = await Notifications.getBadgeCountAsync(); // 현재 뱃지 카운트 가져오기
        await Notifications.setBadgeCountAsync(currentBadgeCount + 1); // +1 증가
        //console.log(`📢 iOS 뱃지 업데이트: ${currentBadgeCount} → ${currentBadgeCount + 1}`);
      }
    } else {
      console.log('알림이 생성되지 않음: 제목 또는 메시지가 없음');
    }


  });
  


  
	const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1]; // JWT의 페이로드 부분
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // URL-safe -> 표준 Base64
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      return JSON.parse(jsonPayload); // JSON 파싱
    } catch (error) {
      console.error('JWT 디코딩 오류:', error);
      return null;
    }
  };



    useEffect(() => {
      (async () => {
        //await saveData();
        //await getData();
        if(Platform.OS === 'ios') {
          await testSecureStore();
        }
      })();
    }, []);
  
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
      }
    } catch (error) {
      console.log('❌ SecureStore 테스트 중 오류:', error);
    }
  }

// 토픽 가입 함수
const subscribeToUserTopics = async (userId) => {
  try {
    const savedSetting = await AsyncStorage.getItem('pushNotification');
    if(userId != null && savedSetting === null){
      // 가입할 사용자별 토픽 목록
      const topicsToSubscribe = [`user-${userId}`]; // userId 기반 토픽 예시
      
      for (const topic of topicsToSubscribe) {
        await subscribeToTopic(messagingInstance, topic);
        
        await AsyncStorage.setItem('topic', topic);
        const to= await AsyncStorage.getItem('topic');

        console.log(`${to}에 가입되었습니다.`);
      }

      //console.log('토픽 구독이 완료되었습니다.');
    } else{
      //console.log('userId가 null입니다.');
    }
    

  } catch (error) {
    console.error('토픽 가입 중 오류:', error.message);
  }
};

  console.log("드가자");
  useEffect(() => {

    const checkToken = async () => {
      try {
        const token = await EncryptedStorage.getItem('userToken');
        if (token) {
          const response = await fetch(`${API_URL}/api/users/update-login-time`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
          
            // JWT에서 externalUserId 추출
            const decodedToken = decodeJWT(token);
            if (!decodedToken || !decodedToken.sub) {
              console.error('JWT에서 externalUserId를 추출할 수 없습니다.');
              return;
            }
            const myExternalUserId = decodedToken.sub;
            const text = await response.text(); // 응답을 문자열로 변환
            console.log("서버 응답:", text);
            if (text.trim() === 'goToProfileScreen') { // trim() 사용해서 불필요한 공백 제거
              navigation.navigate('ProfileScreen', { externalUserId: myExternalUserId });
              //navigation.navigate('LoginScreen');
              //console.log("토큰 확인 성공1");
            } else {
              //console.log("토큰 확인 성공2");
              await subscribeToUserTopics(text);
              // 토큰 확인 성공
              navigation.reset({
                index: 0,
                routes: [{ name: '(tabs)' }],
              });
              //navigation.navigate('LoginScreen');
              //setShowMain(true);
            }
            
          } else if (response.status === 401) {
            // Unauthorized
            navigation.reset({
              index: 0,
              routes: [{ name: 'LoginScreen' }],
            });
           setShowMain(true);
          }
        } else {
          // 토큰 없음, 기존 화면 렌더링
          console.log("토큰없음");
          setShowMain(true);
        }
      } catch (error) {
        console.error('Token check failed:', error);
      } finally {
        SplashScreen.hideAsync();
        StatusBar.setHidden(false);
      }
    };

    checkToken();
  }, []);
  



  if (showMain) {
    return (
      <ImageBackground
        source={require('../assets/images/background2.png')}
        style={styles.background}
        
      >
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('PermissionScreen')}
          >
            <Text style={styles.buttonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }
  

  //return (<View><Text>{"\n"}{"\n"}{"\n"}서버와 통신 실패. 점검 중일 수 있습니다. 네트워크를 확인해 보시고 잠시 후 다시 시도해보세요.</Text></View>); // 로딩 중이거나 네비게이션 상태가 바뀌기 전에는 아무것도 렌더링하지 않음
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'flex-end', // 화면의 아래쪽으로 정렬
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: height * 0.2, // 화면 크기에 비례하여 하단에 여백을 둠
  },
  button: {
    backgroundColor: '#4CAF50', // 버튼 배경 색상
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 5, // 버튼 모서리를 둥글게
    shadowColor: '#000', // 그림자 설정
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5, // 안드로이드에서 그림자 효과
  },
  buttonText: {
    color: '#fff', // 버튼 텍스트 색상
    fontSize: 18,
    fontWeight: 'bold',
    textAlignVertical: 'center', // 텍스트 수직 중앙 정렬
    lineHeight: 21, // 텍스트 수직 중앙 정렬을 위한 lineHeight 설정
  },
});
