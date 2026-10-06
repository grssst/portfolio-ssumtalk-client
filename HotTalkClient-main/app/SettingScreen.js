import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, subscribeToTopic, unsubscribeFromTopic } from '@react-native-firebase/messaging';
import EncryptedStorage from 'react-native-encrypted-storage';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const API_URL = Constants.expoConfig.extra.API_URL;
  //const API_URL = "http://192.168.0.2:5000";



  // Firebase 앱 인스턴스와 Messaging 인스턴스 생성 (모듈식 API 사용)
  const app = getApp();
  const messagingInstance = getMessaging(app);

  useEffect(() => {
    // 저장된 푸시 알림 설정 가져오기
    const loadPushSetting = async () => {
      const savedSetting = await AsyncStorage.getItem('pushNotification');
      if(savedSetting === null) {
        await AsyncStorage.setItem('pushNotification', 'true');
        setIsPushEnabled(true);
      } else {
        setIsPushEnabled(savedSetting === 'true'); // Boolean 값으로 변환
      }
    };

    loadPushSetting();
  }, []);

  const togglePushNotification = async () => {
    const newSetting = !isPushEnabled;
    setIsPushEnabled(newSetting);
    await AsyncStorage.setItem('pushNotification', newSetting.toString());
  
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      console.warn('토큰 없음: 로그인 필요');
      return;
    }
  
    try {
      // 내 userId 가져오기
      const res = await fetch(`${API_URL}/api/users/my-id`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (!res.ok) {
        throw new Error('서버에서 userId 불러오기 실패');
      }
  
      const { userId } = await res.json();
      const userTopic = `user-${userId}`;
      console.log('userTopic:', userTopic);
  
      // meetingTopics 배열 읽기 (["meeting_16","meeting_76", ...])
      const stored = await AsyncStorage.getItem('meetingTopics');
      const meetingTopics = stored ? JSON.parse(stored) : [];
  
      if (newSetting) {
        // 🔔 전체 푸시 ON
  
        // 1) 1:1 토픽 구독
        await subscribeToTopic(messagingInstance, userTopic);
        await AsyncStorage.setItem('topic', userTopic);
        console.log('✅ 1:1 푸시 알림 구독:', userTopic);
  
        // 2) 저장돼 있던 모든 meeting_* 토픽 재구독
        if (meetingTopics.length > 0) {
          for (const t of meetingTopics) {
            try {
              await subscribeToTopic(messagingInstance, t);
              console.log('✅ 그룹 푸시 재구독:', t);
            } catch (e) {
              console.warn('그룹 토픽 재구독 실패:', t, e);
            }
          }
        } else {
          console.log('재구독할 meetingTopics 없음');
        }
  
      } else {
        // 🔕 전체 푸시 OFF
  
        // 1) 1:1 토픽 해제
        await unsubscribeFromTopic(messagingInstance, userTopic);
        console.log('❌ 1:1 푸시 알림 구독 해제:', userTopic);
  
        // 2) 저장돼 있는 모든 meeting_* 토픽 해제
        if (meetingTopics.length > 0) {
          for (const t of meetingTopics) {
            try {
              await unsubscribeFromTopic(messagingInstance, t);
              console.log('❌ 그룹 푸시 구독 해제:', t);
            } catch (e) {
              console.warn('그룹 토픽 해제 중 오류:', t, e);
            }
          }
        } else {
          console.log('해제할 meetingTopics 없음');
        }
  
        // ⚠️ 배열 자체는 지우지 않음
        //   → 나중에 다시 ON 했을 때 그대로 재구독 가능
        //   정말 완전 초기화하고 싶으면 여기서:
        //   await AsyncStorage.removeItem('meetingTopics');
      }
    } catch (error) {
      console.error('푸시 설정 처리 중 오류:', error);
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.label}>푸시 알림</Text>
      <Switch
        value={isPushEnabled}
        onValueChange={togglePushNotification}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
