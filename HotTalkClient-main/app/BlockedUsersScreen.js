import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Button, Alert, TouchableOpacity, Dimensions } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import colors from './styles/colors';
const { width, height } = Dimensions.get('window');

export default function BlockedUsersScreen() {
  const navigation = useNavigation();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = Constants.expoConfig.extra.API_URL;
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const token = await EncryptedStorage.getItem('userToken');
        if (!token) {
          Alert.alert("다시 로그인 해주세요.");
          navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
          return;
        }
        const response = await fetch(`${API_URL}/api/block/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        setBlockedUsers(data);  // 서버에서 받은 데이터를 상태로 설정
        setLoading(false);
      } catch (error) {
        console.error('Error fetching blocked users:', error);
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, []);

  const handleUnblockUser = async (externalUserId) => {
    //console.log('Attempting to unblock user with externalUserId:', externalUserId); // Add this line

    try {
      const token = await EncryptedStorage.getItem('userToken');

      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const response = await fetch(`${API_URL}/api/block/unblock-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ externalUserId }),
      });

      if (response.ok) {
        Alert.alert('성공', '차단 해제 되었습니다.');
        // 차단 해제 후 리스트에서 제거
        setBlockedUsers(prevUsers => prevUsers.filter(user => user.externalUserId !== externalUserId));
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        Alert.alert('Error', 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Error', 'An error occurred while trying to unblock the user.');
    }
};


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="20" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {blockedUsers.length > 0 ? (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.userContainer}>
              <Text style={styles.nickname}>닉네임: {item.nickname}</Text>
              <Text style={styles.details}>나이: {item.age}</Text>
              <Text style={styles.details}>
                성별: {item.gender === 'female' ? '여자' : item.gender === 'male' ? '남자' : item.gender}
              </Text>
              <TouchableOpacity
                style={styles.customButton}
                onPress={() => handleUnblockUser(item.externalUserId)}
              >
                <Text style={styles.buttonText}>차단 해제</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <Text>차단된 사용자가 없습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  userContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  details: {
    fontSize: 16,
  },
  customButton: {
    backgroundColor: colors.main, // 버튼 배경색
    paddingVertical: height * 0.011,        // 세로 패딩
    paddingHorizontal: 25,      // 가로 패딩
    borderRadius: 5,            // 테두리 반경
    alignItems: 'center',       // 내용물 중앙 정렬
    justifyContent: 'center',   // 내용물 중앙 정렬
    marginTop: 18,              // 상단 마진 (필요에 따라 조정)
    // 그림자 효과 (옵션)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,               // 안드로이드용 그림자
  },
  buttonText: {
    color: '#fff',              // 텍스트 색상
    fontSize: height * 0.02,               // 텍스트 크기
    fontWeight: 'bold',         // 텍스트 굵기
  },
});
