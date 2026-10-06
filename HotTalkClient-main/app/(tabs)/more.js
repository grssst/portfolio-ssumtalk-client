import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Image, Modal, TextInput, Button, Alert } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useNavigation } from '@react-navigation/native'; // useNavigation 훅 추가
import Constants from 'expo-constants';


const { width, height } = Dimensions.get('window');

export default function MoreScreen() {
  const navigation = useNavigation(); // useNavigation 훅 사용
  const API_URL = Constants.expoConfig.extra.API_URL;
  


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

  // 차단 목록 화면으로 이동하는 핸들러
  const navigateToBlockedUsers = () => {
    navigation.navigate('BlockedUsersScreen'); // 차단 목록 화면으로 이동
  };

  const navigateToProfileScreen = async () => {
    const token = await EncryptedStorage.getItem('userToken');
    const decodedToken = decodeJWT(token);
    if (!decodedToken || !decodedToken.sub) {
      console.error('JWT에서 externalUserId를 추출할 수 없습니다.');
      return;
    }

    //navigation.navigate('ProfileScreen', { externalUserId: decodedToken.sub, isChangeProfile: true });
    navigation.navigate('ProfileViewScreen', { externalUserId: decodedToken.sub, isChangeProfile: true });

  }

  const navigateToCashScreen = async () => {
    navigation.navigate('CashScreen');
  }

  const navigateToInfoScreen = async () => {
    navigation.navigate('InfoScreen');
  }
  
  const navigateToSettingScreen = async () => {
    navigation.navigate('SettingScreen');
  }

  const navigateToCallCenterScreen = async () => {
    navigation.navigate('CallCenterScreen');
  }

  const navigateToNoticeScreen = async () => {
    navigation.navigate('NoticeScreen');
  }

  return (
    <View style={styles.container}>
        <View style={styles.gridContainer}>

          <TouchableOpacity style={styles.gridButton} onPress={navigateToInfoScreen}>
            <Image source={require('../../assets/images/info.png')} style={styles.gridButtonImage} />
            <Text style={styles.gridButtonText}>이용안내</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton}
          onPress={navigateToProfileScreen}
          >
            <Image source={require('../../assets/images/profile.png')} style={styles.gridButtonImage} />
            <Text style={styles.gridButtonText}>프로필</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton}
          onPress={navigateToCallCenterScreen}>
            <Image source={require('../../assets/images/helpCenter.png')} style={styles.gridButtonImage} />
            <Text style={styles.gridButtonText}>문의하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton}
          onPress={navigateToCashScreen}
          >
            <Image source={require('../../assets/images/buy.png')} style={styles.gridButtonImage} />
            <Text style={styles.gridButtonText}>충전하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton}
          onPress={navigateToNoticeScreen}>
            <Image source={require('../../assets/images/notice.png')} style={styles.gridButtonImage} />
            <Text style={styles.gridButtonText}>공지사항</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridButton} onPress={navigateToSettingScreen}>
            <Image source={require('../../assets/images/setting.png')} style={styles.gridButtonImage} />
            <Text style={styles.gridButtonText}>설정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridButton}
            onPress={navigateToBlockedUsers} // 차단 목록으로 이동
          >
            <Image source={require('../../assets/images/block.png')} style={styles.gridButtonImage} />
            <Text style={styles.gridButtonText}>차단목록</Text>
          </TouchableOpacity>
          
        </View>



      <View style={styles.bottomSection}>
        <View style={styles.bottomTitleContainer}>
          <Text style={styles.bottomTitle}>알림 및 이벤트</Text>
        </View>
        <View style={styles.eventContainer}>
          <View style={styles.eventItem}>
            <Image source={require('../../assets/images/plus.png')} style={styles.eventImage} />
            <Text style={styles.eventText}>리뷰 작성이 큰 힘이 됩니다!</Text>
          </View>
          <View style={styles.eventItem}>
            <Image source={require('../../assets/images/congre.jpg')} style={styles.eventImage} />
            <Text style={styles.eventText}>[이벤트] 게시글 작성 시 캔디 지급(하루 5회)</Text>
          </View>
          <View style={styles.eventItem}>
            <Image source={require('../../assets/images/fix.jpg')} style={styles.eventImage} />
            <Text style={styles.eventText}>개선 제안이나 버그 제보시 수정 해 드리겠습니다.</Text>
          </View>
          <View style={styles.eventItem}>
            <Image source={require('../../assets/images/police.png')} style={styles.eventImage} />
            <Text style={styles.eventText}>아동 청소년 성매매는 불법입니다. {`\n`}각종 성범죄가 발생하지 않도록 해주십시오.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 5,
    marginLeft: 15,
    marginTop: 20,
    marginBottom: 15,
  },
  gridButton: {
    width: '23%',
    backgroundColor: '#fff',
    paddingVertical: 15,
    marginBottom: 10,
    marginRight: 5,
    borderRadius: 5,
    borderColor: '#ddd',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  gridButtonImage: {
    width: 35,
    height: 35,
    marginBottom: 8,
  },
  gridButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  bottomTitleContainer: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  bottomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 475,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  eventImage: {
    width: 35,
    height: 35,
    marginRight: 10,
  },
  eventText: {
    fontSize: width * 0.038,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 배경이 어두워짐
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
