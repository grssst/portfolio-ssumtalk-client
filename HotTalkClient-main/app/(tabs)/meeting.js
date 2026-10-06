import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  FlatList,
  Platform,
  RefreshControl
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MeetingFilter from '../MeetingFilter';
import Constants from 'expo-constants';
import EncryptedStorage from 'react-native-encrypted-storage';

export default function MeetingScreen() {
  const navigation = useNavigation();
  const [meeting, setMeeting] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);
  const API_URL = Constants.expoConfig.extra.API_URL // API 엔드포인트
  //const API_URL = "http://192.168.0.2:5000";
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(null);

  const applyFilters = (selectedFilters) => {
    setFilters(selectedFilters);
    console.log('모임탭 적용된 필터:', selectedFilters);
    fetchMeeting(selectedFilters);
  };

  const fetchMeeting = async (filtersParam) => {
    const currentFilters = filtersParam || filters || { location: '전체지역', selectedTopics: '', sort: '' };
    const locationQuery = currentFilters.location === '전체지역' ? '' : currentFilters.location;
    const selectedTopicsQuery = Array.isArray(currentFilters.selectedTopics) 
      ? currentFilters.selectedTopics.join(',')
      : currentFilters.selectedTopics || '';
    const sortQuery = currentFilters.sort || '';
    try {
      setLoading(true);
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      const response = await fetch(
        `${API_URL}/api/meeting/get-meeting?location=${encodeURIComponent(locationQuery)}&selectedTopics=${encodeURIComponent(selectedTopicsQuery)}&sort=${encodeURIComponent(sortQuery)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMeeting(data);
        //console.log(data);
      } else if (response.status === 401) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      } else {
        console.error('미팅을 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('미팅을 가져오는 중 오류 발생:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setLoading(true);
      fetchMeeting(filters);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      console.log("탭 버튼 눌림 감지");
    });
    return unsubscribe;
  }, [navigation, filters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMeeting(filters);
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      fetchMeeting(filters);
    }, [filters])
  );

  // FlatList의 렌더 아이템 함수
  const renderMeetingItem = ({ item, index }) => {
    return (
      <TouchableOpacity 
        key={`${item.id}-${index}`} 
        style={styles.postCard} 
        onPress={() => navigation.navigate("MeetingViewScreen", { meetingId: item.id })}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.image} 
        />
        <View style={styles.postContent}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {item.title}
            </Text>
            <Text style={styles.description}>
              {item.description.length > 20 
                ? item.description.slice(0, 20) + '...' 
                : item.description}
            </Text>
            <View style={styles.detailContainer}>
              <Text style={styles.detailText}>{item.topic}</Text>
              <Text style={styles.detailText}>·  {item.location}</Text>
              <Text style={styles.detailText}> ·   멤버 {`${item.participantCount || 0}/${item.maxParticipants || 0}`}명</Text>
            </View>
            <Text style={styles.venue}>모임 대표 : {item.writerNickname}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.viewContainer}>
      <View style={{ zIndex: 10, marginBottom: 50 }}>
        <MeetingFilter applyFilters={applyFilters} showWriteButton={true} />
      </View>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={meeting}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderMeetingItem}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20 }}>
              미팅이 없습니다.
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  viewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 0,
    marginLeft: 10,
  },
  postCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 0,
    marginBottom: 10,
    alignItems: 'center',
  },
  image: {
    width: 85,
    height: 85,
    resizeMode: 'cover',
    borderRadius: 15,
    marginRight: 10,
  },
  postContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#5E5E5E',
    marginTop: 4,
  },
  detailContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#777',
  },
  venue: {
    fontSize: 13,
    color: '#8F8F8F',
  },
  location: {
    fontSize: 14,
    color: '#777',
  },
});
