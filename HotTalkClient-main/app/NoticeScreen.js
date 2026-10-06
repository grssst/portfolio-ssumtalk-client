import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ToastAndroid, BackHandler, RefreshControl, Modal, Dimensions, Pressable, TextInput, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, useIsFocused, useNavigationState } from '@react-navigation/native';
import Constants from 'expo-constants';







const { width } = Dimensions.get('window'); // 화면 너비 가져오기

export default function NoticeScreen() {
	const [notices, setNotices] = useState([]); // 공지사항 데이터
	const [expandedId, setExpandedId] = useState(null); // 펼쳐진 공지사항 ID
	const [isLoading, setIsLoading] = useState(true); // 로딩 상태
	const [refreshing, setRefreshing] = useState(false); // 새로고침 상태
	const API_URL = Constants.expoConfig.extra.API_URL;

  // ✅ 공지사항 불러오기 함수
  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/notices`); // API 호출
      const data = await response.json();

      // 최신순 정렬 (createdAt 기준 내림차순)
      const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotices(sortedData);
    } catch (error) {
      console.error('공지사항 불러오기 오류:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ 화면이 처음 로드될 때 공지사항 불러오기
  useEffect(() => {
    fetchNotices();
  }, []);

  // ✅ 새로고침 핸들러
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotices();
  }, []);

  // ✅ 공지사항 펼치기/접기
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };









  return (
    <View style={{ flex: 1 }}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#888" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.noticeItem} onPress={() => toggleExpand(item.id)}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</Text>
              </View>
              {expandedId === item.id && <Text style={styles.content}>{item.content}</Text>}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noticeItem: {
    width: width, // 화면 꽉 채우기
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1, // 구분선 추가
    borderBottomColor: '#ddd',
  },
  titleContainer: {
    flexDirection: 'column', // 제목과 날짜를 세로로 배치
  },
  title: {
    fontSize: 14, // 제목 글자 크기 줄임
    fontWeight: 'bold',
    color: '#585858',
  },
  date: {
    fontSize: 13,
    color: '#777',
    marginTop: 3, // 제목과 날짜 간격 조정
  },
  content: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
