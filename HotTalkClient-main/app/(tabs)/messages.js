import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Alert, AppState } from 'react-native';
import { formatDistanceToNow, formatDistance } from 'date-fns';
import { he, ko } from 'date-fns/locale';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import EncryptedStorage from 'react-native-encrypted-storage';
import * as Notifications from 'expo-notifications';



const formatTimestamp = (timestamp) => {
  const now = new Date();
  const differenceInMinutes = Math.floor((now - new Date(timestamp)) / (1000 * 60));
  
  if (differenceInMinutes < 1) {
    return '방금';
  } else if (differenceInMinutes < 60) {
    return `${differenceInMinutes}분 전`;
  } else if (differenceInMinutes < 1440) {
    const hours = Math.floor(differenceInMinutes / 60);
    return `${hours}시간 전`;
  } else {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    }); // "12월 1일"과 같은 형식
  }
};

const { width, height } = Dimensions.get('window');

export default function MessagesScreen() {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = Constants.expoConfig.extra.API_URL;
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const navigation = useNavigation();
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [myUserId, setMyUserId] = useState(null);
  const [roomId, setRoomId] = useState(null); // roomId를 초기값 null로 설정
  const [isAppActive, setIsAppActive] = useState(true);
  const [myProfileImageUrl, setMyProfileImageUrl] = useState(null);
  
  // WebSocket 클라이언트를 저장할 ref
  const clientRef = useRef(null);


  // 거리 계산 함수 수정
  // 거리 계산 함수 수정
  const calculateDistance = useCallback((postLatitude, postLongitude) => {
    if (location.latitude === null || location.longitude === null) {
      return null;
    }
  
    const R = 6371; // 지구 반지름 (단위: km)
    const toRad = (value) => (value * Math.PI) / 180; // 도(degree)를 라디안(radian)으로 변환
  
    const lat1 = toRad(location.latitude);
    const lon1 = toRad(location.longitude);
    const lat2 = toRad(postLatitude);
    const lon2 = toRad(postLongitude);
  
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    const distance = R * c; // 결과 단위: km
    return distance;
  }, [location]);

    useEffect(() => {
      const unsubscribe = navigation.addListener('tabPress', () => {
        fetchChatRooms();
        console.log("탭 버튼 눌림 감지");
  
      });
      return unsubscribe; // 컴포넌트 언마운트 시 이벤트 리스너 정리
    }, []);

    
    useEffect(() => {
      const handleAppStateChange = (nextAppState) => {
        setIsAppActive(nextAppState === 'active');
      };
  
      const subscription = AppState.addEventListener('change', handleAppStateChange);
  
      return () => {
        subscription.remove();
      };
    }, []);
  
    useFocusEffect(
      useCallback(() => {
        if (isAppActive) {
          if (Platform.OS === 'android') {
            Notifications.dismissAllNotificationsAsync();
            Notifications.setBadgeCountAsync(0); // 배지 숫자 0으로 초기화
            fetchChatRooms();
            console.log("✅ 안드로이드 알림 삭제됨 (1회만 실행)");
          }
        }
      }, [isAppActive]) // `isAppActive`가 변경될 때만 실행
    );

    
  useEffect(() => {
    if (!chatRooms || chatRooms.length === 0 || !myUserId) return;
  
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws?userId=${myUserId}`),
      debug: (str) => {
        //console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      onConnect: () => {
        //console.log('WebSocket 연결 성공!');
        setConnectionStatus('Connected');
  
        // 모든 roomId에 대해 구독
        chatRooms.forEach((room) => {
          // 기본적으로 구독할 채널과 업데이트할 채팅방 ID는 roomId 그대로입니다.
          let subscriptionChannel = room.roomId;
          let updateRoomId = room.roomId;
          
          // meeting 채팅의 경우 effectiveRoomId를 조합하여 구독
          if (room.roomId.startsWith('meeting_')) {
            const parts = room.roomId.split('_');
            // 예: room.roomId가 "meeting_41_21"이면 effectiveRoomId는 "meeting_41"
            const effectiveRoomId = `${parts[0]}_${parts[1]}`;
            subscriptionChannel = effectiveRoomId;
            // 업데이트할 채팅방 ID는 effectiveRoomId와 내 userId를 조합합니다.
            updateRoomId = `${effectiveRoomId}_${myUserId}`;
          }
          
          client.subscribe(`/topic/chatroom/${subscriptionChannel}`, (message) => {
            const receivedMessage = JSON.parse(message.body);
            
            // 내가 보낸 메시지는 이미 처리된 것으로 가정
            if (receivedMessage.senderId === String(myUserId)) return;
            
            setChatRooms((prevChatRooms) => {
              const updatedChatRooms = prevChatRooms.map((chatRoom) =>
                chatRoom.roomId === updateRoomId
                  ? {
                      ...chatRoom,
                      lastMessage: receivedMessage.messageContent,
                      lastMessageTimestamp: receivedMessage.timestamp,
                      unreadCount: chatRoom.unreadCount + 1,
                    }
                  : chatRoom
              );
              // 최신 메시지 순으로 정렬
              return updatedChatRooms.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
            });
          });
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        setConnectionStatus('Connection Error');
      },
      onWebSocketClose: () => {
        setConnectionStatus('Disconnected');
      },
    });
  
    // WebSocket 활성화
    client.activate();
    clientRef.current = client;
  
    // 컴포넌트 언마운트 시 WebSocket 비활성화
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [chatRooms, myUserId, API_URL]);
  


  // 위치 정보 업데이트
  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('위치 권한이 부여되지 않았습니다.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // 기존 위치가 존재할 경우 거리 계산
      if (location && location.latitude !== null && location.longitude !== null) {
        const distance = calculateDistance(latitude, longitude);
        //console.log(distance);
        //console.log(`기존 위치와 거리 차이: ${distance?.toFixed(2)}m`);

        // 200m 이내면 업데이트 중단
        if (distance < 200 && distance) {
          //console.log("위치 변화가 적어 업데이트 안 함.");
          return;
        }
      }

      
      setLocation({ latitude, longitude });


      // 위치 정보 서버로 전송
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }

      await fetch(`${API_URL}/api/users/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });
    } catch (error) {
      console.error('위치 정보 업데이트 중 오류 발생 messages:', error);
    }
  };

  // 데이터 가져오기
  const fetchChatRooms = async () => {
    try {
      //console.log("데이터 호출 시작");
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const response = await fetch(`${API_URL}/api/userChatRooms/fetchChatRooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // JWT 추가
        },
      });

      if (response.ok) {
        const data = await response.json();
        //console.log(data);
        // 최신 메시지가 있는 채팅방이 맨 위로 오도록 정렬
        const sortedData = data.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
        setMyUserId(data[0]?.myId);
        setMyProfileImageUrl(data[0]?.myProfileImageUrl); // ✅ 추가
        //console.log(data[0]?.myProfileImageUrl);
        setChatRooms(sortedData);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        console.error('Failed to fetch chat rooms');
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchMyLocation = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const response = await fetch(`${API_URL}/api/users/myLocation`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        
        if (data) {
          const latitude = data.latitude;
          const longitude = data.longitude;
          //console.log("서버에서 가져온 내위치:", data);
          setLocation({ latitude: latitude, longitude: longitude });
          
        } 
      } else if(response.status === 401){
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      } 
    }
    catch (error) {
      console.error('내 위치를 가져오는 중 오류 발생:', error);
    }
  }


  
  const goChatting = async ( item ) => {
    if (item.unreadCount > 0 && Platform.OS === 'ios') {
      await decreaseBadgeByUnreadCount(item.unreadCount);
    }

    setChatRooms((prevChatRooms) =>
      prevChatRooms.map((chatRoom) =>
        chatRoom.roomId === item.roomId
          ? { ...chatRoom, unreadCount: 0 }
          : chatRoom
      )
    );
    const targetScreen = item.roomId.startsWith('meeting_')
    ? 'ChattingMeetingScreen'
    : 'ChattingScreen';

  navigation.navigate(targetScreen, {
    youData: item,
    profileImageUrl: item.profileImageUrl,
    meetingRoomId: item.roomId,
    myProfileImageUrl, 
  });
  }

  const decreaseBadgeByUnreadCount = async (unreadCount) => {
    try {
      const currentBadge = await Notifications.getBadgeCountAsync();
      const newBadge = Math.max(0, currentBadge - unreadCount); // 최소 0으로 유지
  
      await Notifications.setBadgeCountAsync(newBadge);

      console.log(`🔽 배지 개수 감소: ${currentBadge} → ${newBadge}`);
    } catch (error) {
      console.error("❌ 배지 개수 업데이트 중 오류 발생:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      //fetchChatRooms();  
      setTimeout(() => {
        fetchChatRooms();  
      }, 200); // 약간의 지연 추가
    }, [])
  );

  useEffect(() => {
    if(!chatRooms){
      fetchChatRooms();
    }
    fetchMyLocation();
    updateLocation();
  }, []);

  // "약" 접두사를 제거한 새로운 로케일 생성
  const customKoLocale = {
    ...ko,
    formatDistance: (token, count, options) => {
      // 기본 로케일의 메시지 가져오기
      const result = ko.formatDistance(token, count, options);
      // "약"이라는 단어 제거
      return result.replace(/^약\s/, '');
    },
  };

  const renderItem = ({ item }) => {
    const distance = calculateDistance(item.latitude, item.longitude);
    //console.log(item.latitude);

    // 마지막 메시지 처리: 메시지가 지정한 URL로 시작하면 "사진"으로 표시
    let displayedLastMessage = item.lastMessage;
    if (displayedLastMessage && displayedLastMessage.startsWith("https://d2rhx7q10awn3j")) {
      displayedLastMessage = "사진";
    }

    const isDefaultProfileImage = item.profileImageUrl && item.profileImageUrl.includes('../assets');
    const localImages = {
      male: require('../../assets/images/men.png'),
      female: require('../../assets/images/women.png'),
    };
    return(
      <TouchableOpacity style={styles.messageContainer} onPress={() => goChatting(item)}>
        <Image
          source={
            isDefaultProfileImage
              ? item.profileImageUrl === '../assets/images/men.png'
                ? localImages.male
                : localImages.female
              : { uri: item.profileImageUrl }
          }
          style={styles.profileImage}
        />
        <View style={styles.textContainer}>
        <View style={styles.topRow}>
        <Text style={styles.nickname}>
          {item.nickname}
          {!item.roomId.startsWith("meet") ? ` (${item.age}세) ` : ""}
          { !item.roomId.startsWith("meet") ? (
            <Text style={styles.distance}>
              {distance === null 
                ? '로딩 중...' 
                : distance < 1 
                  ? '1km 미만' 
                  : `${Math.round(distance)} km`}
            </Text>
          ) : (
            <Text style={styles.distance}> {item.gender ? item.gender : "unknown"}
            </Text>
          )}
        </Text>
      </View>


          <Text style={styles.lastMessage} numberOfLines={1}>
            {displayedLastMessage}
          </Text>
        </View>
        <View style={styles.rightSideContainer}>
          {item.unreadCount > 0 && (
            <View
            style={[
              styles.unreadBadge,
              item.unreadCount > 10 && styles.wideUnreadBadge, // 10 이상이면 가로로 긴 스타일 추가
            ]}
          >
            <Text style={styles.unreadCount}>
              {item.unreadCount > 10 ? '10+' : item.unreadCount}
            </Text>
          </View>
          )}
          <Text style={styles.timestamp}>
            {item.lastMessageTimestamp 
              ? formatTimestamp(item.lastMessageTimestamp)
              : '시간 없음'}
          </Text>
        </View>
      </TouchableOpacity>
    )
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>로딩 중...</Text>
      </View>
    );
  }
  //console.log(height);
  return (
    <View style={styles.container}>
      <FlatList
        data={chatRooms}
        keyExtractor={(item) => item.roomId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        initialNumToRender={10} // 초기에 렌더링할 아이템 수
        maxToRenderPerBatch={10} // 한 번에 렌더링할 아이템 수
        windowSize={8} // 화면 안팎의 항목 렌더링
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 대화가 없어요.</Text>
            <Text style={styles.emptyText}>피드에 새로운 글을 등록해보세요!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wideUnreadBadge: {
    width: width * 0.088, // 넓이를 늘려 가로로 긴 원
    height: width * 0.061,
    borderRadius: 16, // 가로로 긴 원에 맞게 조정
  },
  rightSideContainer: {
    justifyContent: 'space-between', // 요소들을 위아래로 정렬
    alignItems: 'center',
    marginLeft: 10, // 텍스트와의 간격
    alignSelf: 'flex-end', // 부모 컨테이너에서 오른쪽 끝에 위치
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    marginTop: 0,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 요소를 좌우로 정렬
    paddingVertical: Platform.OS === 'android' ? height * 0.011 - width * 0.001 : height * 0.011 - width * 0.001,
    paddingHorizontal: width * 0.01,
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginBottom: 1,
  },
  profileImage: {
    width: width * 0.139,
    height: width * 0.139,
    borderRadius: 15,
    marginRight: 10,
    marginLeft: 4,
  },
  textContainer: {
    flex: 1,
    marginRight: 10, // 오른쪽 요소와 간격 추가
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  nickname: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  distance: {
    fontWeight: '',
    color:'#777',
    fontSize: 14,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  timestamp: {
    fontSize: 12,
    color: '#aaa',
    marginTop: height * 0.0075,
    bottom: height * 0.000125,
  },
  unreadBadge: {
    position: 'absolute', // 고정 위치
    top: height * -0.025,             // 상단 기준 간격
    right: 5,           // 오른쪽 기준 간격
    width: width * 0.061,
    height: width * 0.061,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: width * 0.035,
    color: '#fff',
    fontWeight: 'bold',
  },
  separator: {
    height: 0,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: height * 0.5, // 충분한 높이 지정
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  
});
