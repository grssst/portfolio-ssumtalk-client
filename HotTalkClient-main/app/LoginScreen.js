import axios, { HttpStatusCode } from 'axios';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Button, Modal, Alert, Dimensions, Image, DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, getToken, subscribeToTopic, unsubscribeFromTopic } from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const navigation = useNavigation();
  const [userInfo, setUserInfo] = useState(null);
  //const API_URL = Constants.expoConfig.extra.API_URL;
  const API_URL = Constants.expoConfig.extra.API_URL;        //빌드만 하고 다시 위에껄로 바꿔야됨
  //const API_URL = "192.168.0.2:5000";
  const WEB_CLIENT_ID = Constants.expoConfig.extra.WEB_CLIENT_ID;  //안드로이드에서만 구글 로그인할거라 필요없음
  const ANDROID_CLIENT_ID = Constants.expoConfig.extra.ANDROID_CLIENT_ID;
  const CLIENT_ID = WEB_CLIENT_ID;
  const SERVER_REDIRECT_URI = `${API_URL}/api/users/google-login`;
  const SCOPE = 'email profile openid';
  const RESPONSE_TYPE = 'code';
  const AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${SERVER_REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}`;
  //console.log(SERVER_REDIRECT_URI);

  const getDeviceUUID = async () => {
    return DeviceInfo.getUniqueId(); // 고유한 기기 ID 반환
  };


  const app = getApp(); // 기본 Firebase 앱 인스턴스
  const messagingInstance = getMessaging(app);


  const sendFcmTokenToServer = async (token, fcmToken, deviceUUID) => {
    try {
      const response = await fetch(`${API_URL}/api/fcm/save-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // 요청의 Content-Type을 JSON으로 설정
          Authorization: `Bearer ${token}`, // JWT 토큰 포함
        },
        body: JSON.stringify({ fcmToken: fcmToken, UUID: deviceUUID }), // 본문 데이터를 JSON 문자열로 변환
      });
  
      const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const responseJson = await response.json();
      return { status: response.status, ...responseJson };
    } else {
      const text = await response.text();
      console.error("응답이 JSON 형식이 아님:", text);
      return { status: response.status, success: false, message: text };
    }
  
      console.log('FCM 토큰 서버 전송 완료:', fcmToken);
    } catch (error) {
      console.error('FCM 토큰 서버 전송 실패:', error.message);
    }
  };
  


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


  const handleGoogleLogin = async () => {
    try {
      const a = await EncryptedStorage.getItem('userToken');
      if(a){
        await EncryptedStorage.removeItem('userToken');
      }
      //const result = await WebBrowser.openAuthSessionAsync(AUTH_URL, 'http://localhost:8081/LoginScreen');
      const result = await WebBrowser.openAuthSessionAsync(AUTH_URL, 'hottalkscheme://LoginScreen');
      const deviceUUID = await getDeviceUUID(); // 디바이스 UUID 가져오기
      //console.log('Login result:', result);
  
      if (result.type === 'success' && result.url) {
        //console.log("구글 로그인 성공");
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        const externalUserId=url.searchParams.get("externalUserId");
        const hasProfile = url.searchParams.get("hasProfile") === "true";
        const userId = url.searchParams.get("userId");

        //console.log("JWT 토큰:", token);
        //console.log("externalUserId:", externalUserId);
        //console.log("hasProfile:", hasProfile);
        //console.log("userId:", userId);

        // 1. FCM 토큰 가져오기
        const fcmToken = await getToken(messagingInstance);
        await AsyncStorage.setItem('fcmToken', fcmToken);
        //console.log("FCM 토큰:", fcmToken);

       // 2. FCM 토큰 서버로 전송
       const fcmResponse = await sendFcmTokenToServer(token, fcmToken, deviceUUID);
       
       // ✅ 응답이 undefined인지 확인 후 처리
       if (!fcmResponse || typeof fcmResponse !== "object") {
           console.error("탈퇴 후 24시간이 지나지 않았거나 서버가 점검 중 입니다.");
           Alert.alert("네트워크 오류", "서버에 연결할 수 없습니다. 다시 시도해주세요.");
           return;
       }

       // ✅ HTTP 403 → 재가입 제한 안내
       if (fcmResponse.status === 403) {
           console.warn("🚨 로그인 제한으로 인해 로그인 불가");
           Alert.alert("로그인 제한", "탈퇴 후 24시간 이후에 다시 로그인할 수 있습니다.");
           return;
       } 
       
       // ✅ FCM 전송 실패한 경우
       if (!fcmResponse.success) {
           console.error("🚨 FCM 토큰 전송 실패로 인해 로그인 중단");
           Alert.alert("로그인 실패", "서버와 연결할 수 없습니다. 다시 시도해주세요.");
           return;
       }

        // 3. 토픽 구독
        subscribeToUserTopics(userId);
        
        if (hasProfile) {
          console.log("여기까지1");
          // 1. 기존의 모든 토큰 삭제
          const a = await EncryptedStorage.getItem('userToken');
          if(a){
            await EncryptedStorage.removeItem('userToken');
          }
          //await EncryptedStorage.removeItem('userToken');
          console.log("여기까지3");
          EncryptedStorage.setItem('userToken', token);
          
          navigation.reset({
            index: 0,
            routes: [{ name: '(tabs)' }], // 'HomeScreen'을 "토크" 탭이 포함된 화면으로 설정
          });
        } else {
          // 1. 기존의 모든 토큰 삭제
          const a = await EncryptedStorage.getItem('userToken');
          if(a){
            await EncryptedStorage.removeItem('userToken');
          }
          //await EncryptedStorage.removeItem('userToken');
          EncryptedStorage.setItem('userToken', token);
          navigation.navigate('ProfileScreen', { externalUserId: externalUserId });
        }
      } 
      else {
        console.log('Google Login 실패 또는 취소됨.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert("로그인 실패", "다시 시도해주세요.");
    }
  };


  async function testSecureStore() {
    try {
      const deviceUUID = await getDeviceUUID(); // 디바이스 UUID 가져오기

      console.log("🔹 데이터 가져오는 중...");
      const value = await SecureStore.getItemAsync('deviceUuid');
      console.log('📢 저장된 값:', value);
      
      if (value === null) {
        console.log("⚠️ 저장된 값이 null입니다.");
        const value = await SecureStore.getItemAsync('deviceUuid');
        console.log('저장된 값:', value);
        return deviceUUID;
      } else {
        return value;
      }
    
    } catch (error) {
      console.log('❌ SecureStore 테스트 중 오류:', error);
    }
  }
  
  // 실행
  

  

    
  
  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      //console.log('Apple login success:', credential);
      
      // 서버로 사용자 정보 전송
      const response = await axios.post(`${API_URL}/api/users/social-login`, {
        provider: 'apple',
        user: credential.user,
        token: credential.identityToken,
        email: credential.email,
        fullName: credential.fullName,
      });

      // 1. FCM 토큰 가져오기
      const fcmToken = await getToken(messagingInstance);
      //console.log("FCM 토큰:", fcmToken);

      

      const storedUUID = await testSecureStore();

      // 2. FCM 토큰 서버로 전송
      const fcmResponse = await sendFcmTokenToServer(response.data.token, fcmToken, storedUUID);
      
      // ✅ 응답이 undefined인지 확인 후 처리
      if (!fcmResponse || typeof fcmResponse !== "object") {
        console.error("탈퇴 후 24시간이 지나지 않았거나 서버가 점검 중 입니다.");
        Alert.alert("네트워크 오류", "서버에 연결할 수 없습니다. 다시 시도해주세요.");
        return;
      }

      // ✅ HTTP 403 → 재가입 제한 안내
      if (fcmResponse.status === 403) {
          console.warn("🚨 재가입 제한으로 인해 로그인 불가");
          Alert.alert("재가입 제한", "탈퇴 후 24시간 이후에 다시 가입할 수 있습니다.");
          return;
      } 
      
      // ✅ FCM 전송 실패한 경우
      if (!fcmResponse.success) {
          console.error("🚨 FCM 토큰 전송 실패로 인해 로그인 중단");
          Alert.alert("로그인 실패", "서버와 연결할 수 없습니다. 다시 시도해주세요.");
          return;
      }

      // 3. 토픽 구독
      subscribeToUserTopics(response.data.userId);
      //console.log(response.data.userId);

      //console.log('Server response:', response.data);
      
      if (response.data.hasProfile) {
        // 1. 기존의 모든 토큰 삭제
        const token = await EncryptedStorage.getItem('userToken');
        if (token) {
          await EncryptedStorage.removeItem('userToken');
        }
        EncryptedStorage.setItem('userToken', response.data.token);

        navigation.reset({
          index: 0,
          routes: [{ name: '(tabs)' }], // 'HomeScreen'을 "토크" 탭이 포함된 화면으로 설정
        });
      } else {
        const token = await EncryptedStorage.getItem('userToken');
        if (token) {
          await EncryptedStorage.removeItem('userToken');
        }
        
        
        EncryptedStorage.setItem('userToken', response.data.token);
        
        navigation.navigate('ProfileScreen', { externalUserId: credential.user });
      }
    } catch (error) {
      console.error('Apple login failed:', error);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <Image 
        source={require('../assets/images/candy.png')} 
        style={styles.logo} 
      />
        <Text style={styles.title}> 썸톡 로그인</Text>
      </View>
      
      <View style={styles.separator}></View>
    
      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8} // 버튼 모서리 둥글기
        style={{ width: width * 0.8, height: 46, marginBottom: height*0.07 }} // 버튼 크기
        onPress={handleAppleLogin}
        />
      )}
      {(Platform.OS === 'android' || Platform.OS === 'web') && (
        <TouchableOpacity onPress={handleGoogleLogin}>
          <Image
            source={require('../assets/images/android_login_button.png')} // 버튼 이미지 경로
            style={{ width: 210, height: 40, marginBottom: height*0.07}} // 버튼 크기
            //resizeMode="contain" // 이미지 비율 유지
          />
        </TouchableOpacity>
      )}
      <Text style={styles.subText}>로그인시 이용 약관에 모두 동의한 것으로 간주됩니다.</Text>
      <Text style={styles.subText}>만 19세부터 이용이 가능합니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 0,
    marginLeft: -20,
    marginBottom: -45,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 30,
    //fontWeight: 'bold',
    color: '#333',
    marginBottom: Platform.OS === 'android' ? 0 : 20,
    marginTop: height * 0.07,
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  subText: {
    color: '#888',
    textAlign: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 105,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginVertical: 10,
  },
  separator: {
    width: '90%', // 가로 길이 지정
    height: 2,
    backgroundColor: '#ddd',
    marginVertical: 0,
    marginBottom: 20,
  },
  
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
