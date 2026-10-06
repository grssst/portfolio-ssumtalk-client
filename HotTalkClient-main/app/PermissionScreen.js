import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import colors from './styles/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function PermissionScreen() {
  const navigation = useNavigation();
  const API_URL = Constants.expoConfig.extra.API_URL;

  // 위치 권한 요청 (설명 Alert 먼저, 이어서 권한 요청)
  const requestLocationPermission = async () => {
    return new Promise(resolve => {
      Alert.alert(
        '권한 필요',
        '유저들과의 거리 표시를 위해 위치 권한이 필요합니다.',
        [
          {
            text: '취소',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: '계속',
            onPress: async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              resolve(status === 'granted');
            },
          },
        ],
        { cancelable: false }
      );
    });
  };

  // 저장공간 권한 요청 (설명 Alert 먼저, 이어서 권한 요청)
  const requestMediaLibraryPermission = async () => {
    return new Promise(resolve => {
      Alert.alert(
        '권한 필요',
        '프로필 사진 또는 게시글에 이미지 업로드를 위해 저장공간 권한이 필요합니다.',
        [
          {
            text: '취소',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: '계속',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              resolve(status === 'granted');
            },
          },
        ],
        { cancelable: false }
      );
    });
  };

// 푸시 알림 권한 요청 (선택사항)
const requestNotificationPermission = () => {
  return new Promise(resolve => {
    Alert.alert(
      '푸시 알림 권한 요청',
      '푸시 알림을 허용하시겠습니까? (거부해도 진행됩니다.)',
      [
        {
          text: '거부',
          style: 'cancel',
          onPress: async () => {
            console.log('사용자가 푸시 알림 권한을 거부했습니다.');
            await AsyncStorage.setItem('notificationPermissionDenied', 'true');
            resolve(false);
          },
        },
        {
          text: '계속',
          onPress: async () => {
            const { status } = await Notifications.requestPermissionsAsync({
              ios: { allowAlert: true, allowBadge: true, allowSound: true },
            });
            const granted = status === 'granted';
            if (granted) {
              console.log('푸시 알림 권한 허용됨');
              Alert.alert('알림 권한 허용됨', '푸시 알림 권한이 허용되었습니다.');
            } else {
              console.log('푸시 알림 권한 거부됨');
            }
            resolve(granted);
          },
        },
      ],
      { cancelable: false }
    );
  });
};

const requestPermissions = async () => {
  let allGranted = true;

  const loc = await requestLocationPermission();
  if (!loc) allGranted = false;

  const media = await requestMediaLibraryPermission();
  if (!media) allGranted = false;

  // 여기서 await 하면 사용자가 선택할 때까지 대기합니다.
  const notiGranted = await requestNotificationPermission();
  console.log('푸시 알림 권한 결과:', notiGranted);

  if (allGranted) {
    navigation.navigate('LoginScreen');
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>앱 권한 안내</Text>
      <Text style={styles.description}>
        원활한 서비스 이용을 위해 아래의 권한 허용이 필요합니다
      </Text>

      <View style={styles.separator} />

      <View style={styles.permissionSection}>
        <Text style={styles.permissionTitle}>위치 접근</Text>
        <Text style={styles.permissionDescription}>
          주변 회원을 찾기 위해 위치 정보를 사용합니다.
        </Text>
      </View>

      <View style={styles.permissionSection}>
        <Text style={styles.permissionTitle}>저장공간</Text>
        <Text style={styles.permissionDescription}>
          기기의 사진을 업로드하기 위해 저장공간 접근이 필요합니다.
        </Text>
      </View>

      <View style={styles.permissionSection}>
        <Text style={styles.permissionTitle}>알림</Text>
        <Text style={styles.permissionDescription}>
          메시지와 업데이트 알림을 받기 위해 사용합니다.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 100,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#555',
    paddingTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 15,
    marginBottom: 20,
  },
  permissionSection: {
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: colors.main,
    paddingVertical: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
