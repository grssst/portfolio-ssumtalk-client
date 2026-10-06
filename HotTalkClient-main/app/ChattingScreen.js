import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, SafeAreaView, Alert, ActivityIndicator, AppState, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // 아이콘 사용을 위해 추가
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'; // 내비게이션 사용을 위해 추가
import Constants from 'expo-constants';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import 'text-encoding';
import colors from './styles/colors';
import * as ImagePicker from 'expo-image-picker';
import ImageViewer from 'react-native-image-zoom-viewer';


// 최상단에 Intl.DateTimeFormat 객체를 한 번만 생성
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
  timeZone: 'Asia/Seoul',
});

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return dateFormatter.format(date);
};


const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
  timeZone: 'Asia/Seoul',
});

const formatTime = (timestamp) => {
  if (!timestamp || isNaN(new Date(timestamp))) {
    console.error("Invalid timestamp:", timestamp);
    return "Invalid time";
  }
  const date = new Date(timestamp);
  return timeFormatter.format(date);
};



// MessageItem 컴포넌트를 ChattingScreen 밖으로 이동
const MessageItem = React.memo(({ item, myUserId, youData, isDefaultProfileImage, profileImageUrl, previousSenderId, navigation, openImageModal }) => {
  //console.log(`reder: ${item.messageContent}`);
  const isMyMessage = String(item.senderId) === String(myUserId);
  // 이전 메시지와 같은 발신자인 경우 처리

  //console.log(`Item Sender ID: ${item.senderId}, Previous Sender ID: ${previousSenderId}`);
const isSameSenderAsPrevious = item.senderId === previousSenderId;

  const localImages = {
    male: require('../assets/images/men.png'),
    female: require('../assets/images/women.png'),
  };
  // Hooks는 항상 동일한 순서로 호출되어야 하므로 조건문 밖에서 호출

  const formattedTime = formatTime(item.timestamp);
//console.log(item.type);
  //console.log(item);
  return (
    <View>
      {/* 날짜 구분자 */}

      <View style={[styles.messageRow, isMyMessage ? styles.myRow : styles.otherRow]}>
        {/* 상대방의 프로필 이미지 */}
        {!isMyMessage && (
          <TouchableOpacity onPress={async () => { 

            // ID를 숫자로 변환
            const myId = Number(item.myId);
            const senderId = Number(item.senderId);
            const recipientId = Number(item.recipientId);
            let noMyUserId = null;

            if (myId === senderId) {
              noMyUserId = recipientId;
            } else if (myId === recipientId) {
              noMyUserId = senderId;
            }
            if (!noMyUserId) {
              console.warn("상대방 ID를 찾을 수 없음");
              return; // 상대방 ID가 없으면 네비게이션 실행 안 함
            }

          navigation.navigate('ProfileViewScreen', { externalUserId: `userId-${noMyUserId}` }); 
          }}>

            <Image
              source={
                isDefaultProfileImage
                  ? profileImageUrl === '../assets/images/men.png'
                    ? localImages.male
                    : localImages.female
                  : { uri: profileImageUrl }
              }
              style={[
              styles.profileImage,
              isSameSenderAsPrevious && styles.transparentProfileImage, // 연속 메시지일 경우 투명 처리
              ]}
            />
          </TouchableOpacity>
          
        )}
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {/* 상대방의 닉네임 */}
          {!isMyMessage && !isSameSenderAsPrevious && youData.nickname && (
            <Text style={styles.nickname}>{youData.nickname}</Text>
          )}
          <View style={styles.bubbleAndTime}>
            {/* 내 메시지의 시간은 왼쪽에 표시 */}
            {isMyMessage && !item.hideTime && (
              <Text style={[styles.messageTime, styles.myMessageTime]}>{formattedTime}</Text>
            )}
            {item.type === 'image' ? (
              // 이미지 타입이면 Image 컴포넌트로 렌더링
              <TouchableOpacity onPress={() => openImageModal(item.messageContent)}>
                <Image
                  source={{ uri: item.messageContent }}
                  style={{ width: 150, height: 150, borderRadius: 10 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
                {/* 텍스트 메시지이면 Text로 표시 */}
                <Text style={isMyMessage ? styles.messageText : styles.messageTextOther}>
                  {item.messageContent}
                </Text>
              </View>
            )}

            
            {/* 상대방 메시지의 시간은 오른쪽에 표시 */}
            {!isMyMessage && !item.hideTime && (
              <Text style={[styles.messageTime, styles.otherMessageTime]}>{formattedTime}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});





export default function ChattingScreen() {
  const navigation = useNavigation(); // 내비게이션 훅 사용
  const route = useRoute();
  const [loading, setLoading] = useState(true);
  const [chatting, setChatting] = useState([]);
  const [inputText, setInputText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [roomId, setRoomId] = useState(null); // roomId를 초기값 null로 설정
  // route.params에서 상대방 정보 가져오기
  const youData = route.params?.youData;
  const meetingRoomId = route.params?.meetingRoomId;

  const isMeetingRoom = meetingRoomId ? meetingRoomId.startsWith("meeting") : false;
  
  const profileImageUrl = route.params?.profileImageUrl;
  const API_URL = Constants.expoConfig.extra.API_URL;
  // 현재 사용자의 ID를 저장할 상태 추가
  const [myUserId, setMyUserId] = useState(null);
  const [myNickname, setMyNickname] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [isEndOfData, setIsEndOfData] = useState();
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  // WebSocket 클라이언트를 저장할 ref
  const clientRef = useRef(null);
  const [data2, setData2] = useState(null);
  const flatListRef = useRef(null); // FlatList 참조
  const [isMyMessageSent, setIsMyMessageSent] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 처음 로드 여부
  const [appState, setAppState] = useState(AppState.currentState);
  // 모임 나가기 확인 모달을 위한 state 추가
const [leaveMeetingModalVisible, setLeaveMeetingModalVisible] = useState(false);

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [removedChatRoom, setRemovedChatRoom] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const isDefaultProfileImage = profileImageUrl && profileImageUrl.includes('../assets');
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [modalImageUrls, setModalImageUrls] = useState([]); // imageViewer는 배열을 요구함.
  const [initialModalIndex, setInitialModalIndex] = useState(0);
  const [chatEnded, setChatEnded] = useState(false);

  // 이미지 터치 시 모달을 열도록 호출하는 함수
  const openImageModal = (imageUrl) => {
    // ImageViewer는 배열 형태로 URL을 받으므로 단일 이미지의 경우에도 배열로 만들어줍니다.
    setModalImageUrls([{ url: imageUrl }]);
    setInitialModalIndex(0);
    setImageModalVisible(true);
  };

  // 모달 닫기 핸들러
  const closeImageModal = () => {
    setImageModalVisible(false);
    setModalImageUrls([]);
  };

  const fetchChatting = useCallback(async (roomId, lastTimestamp, isRefresh = "false") => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }

      const response = await fetch(`${API_URL}/api/userChatRooms/fetchChatting?roomId=${roomId}&lastTimestamp=${lastTimestamp}&isRefresh=${isRefresh}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`, // JWT 추가
        },
      });




      if (response.ok) {
        
        //console.log("수신됨");
        const data = await response.json(); // JSON 응답 처리
        //console.log(data.chatting);


        setData2(data);
        console.log(data);
        // 다음 요청에서 사용할 lastTimestamp 저장
        if (data.chatting[0].nextTimestamp) {
          setLastTimestamp(data.chatting[0].nextTimestamp);
        }


        // `isEndOfData`가 true이면 더 이상 데이터를 불러오지 않음
        if (data.chatting[0].nextTimestamp == null) {
          setIsEndOfData(true); // 데이터를 끝까지 불러왔음을 설정
        } else {
          setIsEndOfData(false); // 데이터가 더 있음
        }
        
        if (data.chatting.length > 0) {      //처음 메시지 호출??
          //console.log(data.chatting);
          setMyUserId(data.chatting[0].myId);
          setMyNickname(data.chatting[0].myNickname);
          //setChatting((prevChatting) => [...prevChatting, ...data.chatting]);

          //fetchChatting이 실행될때마다 새로 가져온 데이터부분에 대해서만 날짜를 삽입하는 로직을 수행. 직접 sendMessage했을때는 바로 이전 레코드와 비교하면 됨. 이건 나중에 구현
          // 날짜 구분자 삽입 후 상태 업데이트
          
        const processedChatting = computeDate(data.chatting, chatting);
        
        setChatting((prevChatting) => [...prevChatting, ...processedChatting]);
        setLoading(false);
        //console.log("렌더링 준비완료");
        }
      } else if (response.status === 401) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      } else {
        console.error('Failed to fetch chatting');
        Alert.alert("오류", "채팅 내역을 가져오는 중 문제가 발생했습니다.");
      }
    }
    catch (error) {
      console.error('Error fetching chatting:', error);
      Alert.alert("오류", "채팅 내역을 가져오는 중 문제가 발생했습니다.");
    }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL, navigation, chatting]);

  const computeDate = (chattingData, existingChatting = []) => {
    const processedChatting = [];
  
    // 기존 메시지 중 마지막 메시지 가져오기
    const lastExistingMessage = existingChatting.length > 0 
      ? existingChatting[existingChatting.length - 1] // 기존 메시지의 최대 인덱스 확인
      : null;
  
    //console.log(lastExistingMessage);
    chattingData.forEach((item, index) => {
      // 이전 메시지는 새로 받은 메시지의 첫 번째 메시지라면 기존 메시지의 마지막 메시지를 참조
      const previousItem = index === 0 && lastExistingMessage ? lastExistingMessage : chattingData[index - 1];
      const previousDate = previousItem ? formatDate(previousItem.timestamp) : null;
      const currentDate = formatDate(item.timestamp); // 현재 메시지의 날짜
      const nextDate =
        index < chattingData.length - 1
          ? formatDate(chattingData[index + 1].timestamp) // 다음 메시지의 날짜
          : null;
  
      let hideTime = false;
  
      // 이전 메시지와 발신자 및 시간 비교 (경계 포함)
      if (
        previousItem &&
        previousItem.senderId === item.senderId &&
        formatTime(previousItem.timestamp) === formatTime(item.timestamp)
      ) {
        hideTime = true;
      }
  
      // hideTime 속성 추가
      item.hideTime = hideTime;
  
      // 현재 메시지 추가
      processedChatting.push(item);
  
      // 처음 메시지이거나, 다음 메시지와 날짜가 다르고 맨위 메시지가 아닐 경우 날짜 구분자 추가
      if (
        (index === chattingData.length - 1 && item.nextTimestamp === null) ||
        (currentDate !== nextDate && index !== chattingData.length - 1)
      ) {
        processedChatting.push({
          senderId: "날짜", // 날짜 구분자 식별용
          timestamp: item.timestamp,
        });
      }
    });
  
    //console.log("컴퓨트 데이트 완료");
    return processedChatting;
  };
  
  
  
  useEffect(() => {
    if (!profileUserId && data2 && data2.chatting && data2.chatting.length > 0) {
      //console.log("data2 업데이트됨:", data2.chatting[0]);
  
      const myId = Number(data2.chatting[0].myId);
      const senderId = Number(data2.chatting[0].senderId);
      const recipientId = Number(data2.chatting[0].recipientId);
  
      setProfileUserId(senderId === myId ? recipientId : senderId);
      //console.log("설정된 profileUserId:", senderId === myId ? recipientId : senderId);
    }
  }, [data2, profileUserId]); // profileUserId가 null일 때만 실행
  




  useEffect(() => {
    if (roomId) {
      if (!isEndOfData && !data2) {
        setLoading(true);
        fetchChatting(roomId, lastTimestamp); // roomId와 lastTimestamp를 기준으로 데이터 요청
      }
    }
  }, [roomId, isEndOfData, data2, fetchChatting, lastTimestamp]);

  useEffect(() => {
    // 데이터 로드가 완료되고 처음 로드 시에만 실행
    if (!loading && chatting.length > 0 && isInitialLoad) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100); // 약간의 지연 추가
      setIsInitialLoad(false); // 플래그 업데이트
    }
  }, [loading, chatting, isInitialLoad]);


// 기존 roomId에서 meeting_으로 시작하면 앞의 두 부분만 추출
const getEffectiveRoomId = (roomId) => {
  if (roomId.startsWith("meeting_")) {
    const parts = roomId.split("_");
    return parts.slice(0, 2).join("_"); // 예: "meeting_23"
  }
  return roomId;
};


  useEffect(() => {
    if (youData && !roomId) {
      setRoomId(youData.roomId); // roomId 상태가 null일 때만 설정
      //console.log(youData);
    }
  }, [youData, roomId]);

  // 새로고침 기능
  const onRefresh = useCallback(() => {
    if (isEndOfData) {
      // 데이터가 끝까지 불러와졌으면 새로고침 동작하지 않도록
      setRefreshing(false); // 새로고침 상태 리셋
      return;
    }
    else {
      setRefreshing(true);
      fetchChatting(roomId, lastTimestamp, "false"); // 게시글 불러오기
    }
  }, [roomId, lastTimestamp, isEndOfData, fetchChatting]);

  const getRecipientId = (roomId, myId) => {
    if (!roomId || !myId) {
      console.error('roomId 또는 myId가 유효하지 않습니다.');
      return null;
    }

    // 정규 표현식을 사용하여 'room_<id1>_<id2>' 형식 검증 및 추출
    const regex = /^(?:room|meeting)_(\d+)_(\d+)$/;

    const match = roomId.match(regex);

    if (!match) {
      console.error('roomId 형식이 올바르지 않습니다.');
      return null;
    }

    const id1 = match[1];
    const id2 = match[2];

    const myIdStr = String(myId); // myId를 문자열로 변환

    if (id1 === myIdStr) {
      return id2;
    } else if (id2 === myIdStr) {
      return id1;
    } else {
      console.error('roomId에 myId가 포함되어 있지 않습니다');
      return null;
    }
  };



  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'background' && roomId) {
      // AppState가 background로 전환되었을 때 호출
      saveDisconnectTime(roomId);
    }
    appState.current = nextAppState; // 상태 업데이트
  }, [roomId]); // roomId만 의존성에 포함
  
  useFocusEffect(
    useCallback(() => {
      if (roomId) {
        saveDisconnectTime(roomId); // 화면 진입 시 호출
      }
  
      const subscription = AppState.addEventListener('change', handleAppStateChange);
  
      return () => {
        if (roomId) {
          saveDisconnectTime(roomId); // 화면을 떠날 때 호출
        }
        subscription.remove(); // 리스너 제거
      };
    }, [handleAppStateChange, roomId]) // 의존성에 handleAppStateChange 포함
  );
  

  const saveDisconnectTime = async (roomId) => {
    try {
      if(removeChatRoom === true){
        return;
      }
      //console.log("호출됨");
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const response = await fetch(`${API_URL}/api/userChatRooms/saveDisconnectTime?roomId=${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // JWT 추가
        },
      });

      if (response.ok) {
        const data = await response.text();
        //console.log(data);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        console.error('Failed to save disconnect');
      }
    } catch (error) {
      console.error('Error save disconnect:', error);
    }
  };

  const handleLeaveMeeting = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      // meetingRoomId를 쿼리 파라미터로 전달 (body는 제거)
      const response = await fetch(`${API_URL}/api/meeting/leave-meeting?meetingId=${meetingRoomId}`, {
        method: 'POST', // POST 방식 사용
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        Alert.alert("모임 나가기", "모임을 성공적으로 나갔습니다.");
        navigation.navigate('messages');
      } else {
        const errorMessage = await response.text();
        console.log(errorMessage);
        Alert.alert("모임 나가기 실패", errorMessage);
      }
    } catch (error) {
      console.error("모임 나가기 중 오류 발생:", error);
      Alert.alert("오류", "모임 나가기 중 오류가 발생했습니다.");
    }
  };
  
  
  // 예시: 선택한 이미지 업로드 후 채팅 메시지로 전송하는 함수
  const handleImageUpload = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      });
  
      formData.append('roomId', roomId);
      formData.append('senderId', myUserId);
      formData.append('recipientId', getRecipientId(roomId, myUserId));
      formData.append('myNickname', myNickname);

      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
  
      const response = await fetch(`${API_URL}/api/chat/uploadImage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      const result = await response.json();
  
      if (response.ok && result.imageUrl) {
        const now = Date.now();
  
        const newMessage = {
          senderId: String(myUserId),
          roomId,
          recipientId: String(getRecipientId(roomId, myUserId)),
          messageContent: result.imageUrl, // 서버에서 받은 이미지 URL
          timestamp: now,
          formattedTime: formatTime(now),
          myNickname,
          type: 'image',
        };
  
        setChatting((prevChatting) => {
          const updatedChatting = [newMessage, ...prevChatting];
  
          // 새 메시지는 항상 시간 표시
          newMessage.hideTime = false;
  
          // 바로 위 메시지 hideTime 재계산
          if (updatedChatting.length > 1) {
            const previousMessage = { ...updatedChatting[1] };
            const sameSender = previousMessage.senderId === newMessage.senderId;
            const sameTime =
              formatTime(previousMessage.timestamp) === formatTime(newMessage.timestamp);
            previousMessage.hideTime = sameSender && sameTime;
            updatedChatting[1] = previousMessage;
          }
  
          // 날짜 구분자 처리 (sendMessage와 동일 로직)
          const currentDate = formatDate(newMessage.timestamp);
          const firstMessageDate =
            prevChatting.length > 0 ? formatDate(prevChatting[0].timestamp) : null;
  
          if (currentDate !== firstMessageDate) {
            updatedChatting.splice(1, 0, {
              senderId: '날짜',
              timestamp: newMessage.timestamp,
            });
          }
  
          return updatedChatting;
        });
  
        Alert.alert("이미지 전송 완료");
      } else {
        Alert.alert("이미지 전송 실패", result.error || "알 수 없는 에러 발생");
      }
    } catch (error) {
      Alert.alert("이미지 전송 중 오류", error.message);
    }
  };
  
  


  // 메시지 전송 함수
  const sendMessage = useCallback(() => {
    if (inputText.trim() === '') return;
    if (inputText.trim().length > 500) {
      Alert.alert("메시지가 너무 깁니다.");
      return;
    }

    if (!getRecipientId(roomId, myUserId)) {
      Alert.alert("수신자 정보를 찾을 수 없습니다.");
      return;
    }

    const newMessage = {
      senderId: String(myUserId), // myUserId를 문자열로 변환
      roomId: roomId,
      recipientId: String(getRecipientId(roomId, myUserId)), // recipientId도 문자열로 설정
      messageContent: inputText,
      timestamp: new Date().getTime(), // epoch milliseconds
      formattedTime: formatTime(new Date().getTime()), // 미리 계산
      myNickname: myNickname,
      type: "text",
    };


    
    console.log(newMessage);
    setChatting((prevChatting) => {
      const updatedChatting = [newMessage, ...prevChatting];
      // 새로운 메시지 항상 시간을 표시
    newMessage.hideTime = false;

    // 바로 위 메시지의 `hideTime` 재계산
    if (updatedChatting.length > 1) {
      const previousMessage = { ...updatedChatting[1] }; // 기존 메시지 복사
      const sameSender =
        previousMessage.senderId === newMessage.senderId;
      const sameTime =
        formatTime(previousMessage.timestamp) === formatTime(newMessage.timestamp);
      previousMessage.hideTime = sameSender && sameTime;
      // 배열의 참조 변경
      updatedChatting[1] = previousMessage;
    }

      const currentDate = formatDate(newMessage.timestamp);
      const firstMessageDate = prevChatting.length > 0 ? formatDate(prevChatting[0].timestamp) : null;
      //console.log(prevChatting[0]);
      //console.log(newMessage);
      if (currentDate !== firstMessageDate) {
        updatedChatting.splice(1, 0, {
          senderId: "날짜", // 날짜 구분자 식별용
          timestamp: newMessage.timestamp,
        });
      }
  
      return updatedChatting;
    });

    // WebSocket을 통해 메시지 전송
    //if (clientRef.current && clientRef.current.connected) {
    //  clientRef.current.publish({
    //    destination: '/app/postMessage', // 서버의 @MessageMapping 경로
    //    body: JSON.stringify(newMessage),
    //  });
    //} else {
   //   Alert.alert("연결이 끊어졌습니다. 다시 시도해주세요.");
   //   return;
   // }

    reconnectAndSendMessage(newMessage); // 연결 상태 확인 후 메시지 전송
    setIsMyMessageSent(true); // 내가 보낸 메시지임을 설정
    setInputText('');
  }, [inputText, myUserId, roomId]);


  useEffect(() => {
    if (!roomId || !myUserId) return;
    //console.log(myUserId);
    const effectiveRoomId = getEffectiveRoomId(roomId);
    console.log(effectiveRoomId);
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws?roomId=${effectiveRoomId}&userId=${myUserId}`),
      debug: (str) => {
        //console.log('STOMP Debug:', str);
      },
      reconnectDelay: 1500,
      onConnect: () => {
        //console.log('WebSocket 연결 성공!:', myUserId);
        setConnectionStatus('Connected');
        client.subscribe(`/topic/chatroom/${effectiveRoomId }`, (message) => {
          const receivedMessage = JSON.parse(message.body); // 서버에서 보낸 메시지 파싱
          //console.log(receivedMessage);

          
          if (receivedMessage.senderId === String(myUserId)) {
            // 내가 보낸 메시지는 이미 처리됨
            return;
          }
          // 1) 올바른 변수명 사용
        if (receivedMessage.messageContent === 'System: 채팅방이 종료되었습니다.') {
          Alert.alert('알림', '채팅방이 종료되었습니다. 현재 화면에서 나가실 경우 채팅 내역이 모두 삭제됩니다. 필요한 내용을 캡쳐하세요.');
          setChatEnded(true);
          return;
        }
        //console.log(receivedMessage);
          // 상대방 메시지 추가 및 날짜 구분자 처리
         setChatting((prevChatting) => {
          const updatedChatting = [receivedMessage, ...prevChatting];
          const currentDate = formatDate(receivedMessage.timestamp);
          const firstMessageDate = prevChatting.length > 0 ? formatDate(prevChatting[0].timestamp) : null;

          receivedMessage.hideTime = false;

          // 바로 위 메시지의 `hideTime` 재계산
          if (updatedChatting.length > 1) {
            const previousMessage = { ...updatedChatting[1] }; // 기존 메시지 복사
            const sameSender =
              previousMessage.senderId === receivedMessage.senderId;
            const sameTime =
              formatTime(previousMessage.timestamp) === formatTime(receivedMessage.timestamp);
            previousMessage.hideTime = sameSender && sameTime;
            // 배열의 참조 변경
            updatedChatting[1] = previousMessage;
          }

          if (currentDate !== firstMessageDate) {
            updatedChatting.splice(1, 0, {
              senderId: "날짜", // 날짜 구분자 식별용
              timestamp: receivedMessage.timestamp,
            });
          }

          return updatedChatting;
        });

        });
      },

      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        setConnectionStatus('Connection Error');
      },
      onWebSocketClose: () => {
        //console.log('WebSocket 연결 종료');
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
  }, [roomId, myUserId, API_URL]);

  const reconnectAndSendMessage = async (message) => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.log('웹소켓 연결이 끊어졌습니다. 재연결 시도 중...');
      const client = clientRef.current;
  
      // 재연결 시도
      client.activate();
  
      // 연결 대기
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (client.connected) {
            clearInterval(interval);
            resolve();
          }
        }, 500);
      });
  
      console.log('웹소켓 재연결 성공');
    }
  
    // 메시지 전송
    clientRef.current.publish({
      destination: '/app/postMessage',
      body: JSON.stringify(message),
    });
  };

  // useEffect로 메시지 전송 후 스크롤
  useEffect(() => {
    if (isMyMessageSent) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 100); // 약간의 지연 추가
      setIsMyMessageSent(false); // 플래그 초기화
    }
  }, [isMyMessageSent]);


  const handleMorePress = (event) => {
    //setSelectedPost(post);
    const { pageX, pageY } = event.nativeEvent;
    setModalPosition({ x: pageX, y: pageY });
    setOptionsVisible(true);
  };

  const closeOptionsModal = () => {
    setModalPosition({ x: 0, y: 0 }); // 모달 위치 초기화
  };

  // `modalPosition`이 업데이트된 후 `optionsVisible` 상태를 false로 설정
  useEffect(() => {
    if (modalPosition.x === 0 && modalPosition.y === 0) {
      setOptionsVisible(false);
      //console.log("Modal position reset and options modal closed.");
    }
  }, [modalPosition]); // modalPosition이 변경될 때 실행

  useEffect(() => {
    if (reportModalVisible==false) {
      setModalPosition({ x: 0, y: 0 }); 
    }
  }, [reportModalVisible]); 

  useEffect(() => {
    if (blockModalVisible==false) {
      setModalPosition({ x: 0, y: 0 }); 
    }
  }, [blockModalVisible]); 

  useEffect(() => {
    if (removeModalVisible==false) {
      setModalPosition({ x: 0, y: 0 }); 
    }
  }, [removeModalVisible]); 

  const reportUser = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const reportData = {
        reportedUserId: getRecipientId(roomId, myUserId), // 
        reportContent, // 신고 내용
        roomId: roomId, // 신고 대상 게시물 ID
        //reportedExternalUserId: selectedPost.externalUserId
        isChatRoom: true,
      };


      const response = await fetch(`${API_URL}/api/report/report-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        console.log('신고가 성공적으로 접수되었습니다.');
        Alert.alert("알림", "신고가 접수되었습니다.");
        setReportContent(null);
        setReportModalVisible(false);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        console.error('신고를 접수하는 데 실패했습니다.');
        alert("실패하였습니다. 잠시 후 다시 시도해주십시오.");
        setReportContent(null);
        setReportModalVisible(false);
      }
    } catch (error) {
      console.error('신고 중 오류 발생:', error);
      alert("실패하였습니다. 잠시 후 다시 시도해주십시오.");
      setReportContent(null);
      setReportModalVisible(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      console.log("차단시도");
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  

      const blockedUserId = getRecipientId(roomId, myUserId);
    if (!blockedUserId) {
      Alert.alert("차단할 사용자를 찾을 수 없습니다.");
      return;
    }

    const blockData = { blockedUserId: String(blockedUserId) };
    console.log('▶ blockData:', blockData);

      const response = await fetch(`${API_URL}/api/block/block-user-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(blockData),
      });
  
      if (response.ok) {
        console.log('사용자가 성공적으로 차단되었습니다.');
        Alert.alert('차단 완료', '사용자가 차단되었습니다.');
        setBlockModalVisible(false);
        setRemovedChatRoom(true);
        removeChatRoom();
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        console.error('사용자를 차단하는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 차단 중 오류 발생:', error);
    }
  };

  // 이미지 피커 실행 함수
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '이미지 접근 권한이 필요합니다.');
      return;
    }
    // 이미지 선택
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
    });
    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      // 이미지 선택 후 알림 띄우기
      Alert.alert(
        "알림",
        "이미지를 전송하시겠습니까?",
        [
          {
            text: "취소",
            style: "cancel",
          },
          {
            text: "확인",
            onPress: () => handleImageUpload(selectedUri),
          },
        ],
        { cancelable: true }
      );
    }
  };


  const removeChatRoom = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }

      // 1) 상대방에게 WebSocket 으로 시스템 메시지 전달
      const systemMsg = {
        senderId: String(myUserId),
        recipientId: String(getRecipientId(roomId, myUserId)),
        roomId,
        messageContent: 'System: 채팅방이 종료되었습니다.',
        timestamp: Date.now(),
        myNickname: myNickname,
        type: 'system'
      };
      clientRef.current.publish({
        destination: '/app/postMessage',
        body: JSON.stringify(systemMsg)
      });

      // 2) 잠깐 대기 (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));

      const response = await fetch(`${API_URL}/api/userChatRooms/removeChatRoom?roomId=${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {




        console.log('채팅방을 삭제했습니다.');
        navigation.navigate('messages');
        //setReportContent(null);
        //setReportModalVisible(false);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        console.error('채팅방 삭제 실패');
        alert("실패하였습니다. 잠시 후 다시 시도해주십시오.");
        //setReportContent(null);
        //setReportModalVisible(false);
      }
    } catch (error) {
      console.error('채팅방 삭제 중 오류 발생:', error);
      alert("실패하였습니다. 잠시 후 다시 시도해주십시오.");
      //setReportContent(null);
      //setReportModalVisible(false);
    }
  }





  const renderItem = useCallback(({ item, index }) => {
    //console.log("renderItem", item.messageContent);
    const previousSenderId =
    index < chatting.length - 1 ? chatting[index + 1]?.senderId : null;
    //console.log(previousSenderId);
    // 날짜 구분자인 경우
    if (item.senderId === "날짜") {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
        </View>
      );
    }
  
    // 일반 메시지인 경우
    return (
      <MessageItem
        item={item}
        myUserId={myUserId}
        youData={youData}
        isDefaultProfileImage={isDefaultProfileImage}
        profileImageUrl={profileImageUrl}
        previousSenderId={previousSenderId} // 이전 발신자 ID 전달
        navigation={navigation}
        openImageModal={openImageModal}
      />
    );
  }, [myUserId, youData, isDefaultProfileImage, profileImageUrl, chatting]);
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>로딩 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // iOS 상태바 높이를 고려
      style={{ flex: 1 }} // 전체 화면을 감싸도록 설정
    >
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{youData.nickname}</Text>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={(e) => handleMorePress(e)}
          >
            <Image
              source={require('../assets/images/moreBlack.png')}
              style={styles.moreIcon}
            />
          </TouchableOpacity>
        </View>

        {/* 메시지 리스트 */}
        <FlatList
          ref={flatListRef} // FlatList에 참조 연결
          data={chatting}
          renderItem={renderItem}
          keyExtractor={(item) => (`${item.senderId}-${item.timestamp}`)}
          contentContainerStyle={styles.messagesList}
          initialNumToRender={15}
          maxToRenderPerBatch={30}
          removeClippedSubviews={true}
          windowSize={15}
          onEndReached={onRefresh}
          onEndReachedThreshold={0.1}
          inverted
        />

    { !chatEnded && (
         <>
        {/* 입력 영역 */}

          <View style={styles.inputContainer}>
            {/* 왼쪽에 photo 아이콘 추가 */}
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          <Image source={require('../assets/images/photo.png')} style={styles.photoIcon} />
        </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="메시지를 입력하세요."
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>전송</Text>
            </TouchableOpacity>
          </View>
          {/* 아래에 여백 추가 */}
          <View style={styles.bottomSpacing} />
          </>
       )}

        {/* 옵션 모달 */}
        {optionsVisible && (
          <Modal
            visible={optionsVisible}
            transparent={true}
            animationType="none"
            onRequestClose={closeOptionsModal}
          >
            <Pressable style={styles.noOverlay} onPress={closeOptionsModal}>
              <View style={[styles.optionsModal, { top: modalPosition.y - 20, left: modalPosition.x - 120 }]}>
                {isMeetingRoom ? (
                  <>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setOptionsVisible(false);
                  if (meetingRoomId && meetingRoomId.startsWith("meeting_")) {
                    const parts = meetingRoomId.split("_");
                    const meetingIdFromRoom = parseInt(parts[1], 10);
                    navigation.navigate("MeetingViewScreen", { meetingId: meetingIdFromRoom });
                  } else if (meetingInfo) {
                    navigation.navigate("MeetingViewScreen", { meetingId: meetingInfo.id });
                  }
                }}
              >
                <Text style={styles.optionText}>모임 보기</Text>
              </TouchableOpacity>

                    <View style={styles.optionDivider} />
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={() => {
                        setOptionsVisible(false); // 옵션 모달 닫기
                        // 모임 나가기 확인 모달 띄우기 (200ms 지연)
                        setTimeout(() => setLeaveMeetingModalVisible(true), 200);
                      }}
                    >
                      <Text style={styles.optionText}>모임 나가기</Text>
                    </TouchableOpacity>

                  </>
                ) : (
                  <>
                  {!chatEnded && (
                    <>
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={async () => {
                        setOptionsVisible(false);
                        setTimeout(() => setReportModalVisible(true), 200);
                      }}
                    >
                      <Text style={styles.optionText}>신고하기</Text>
                    </TouchableOpacity>
                    <View style={styles.optionDivider} />
                    </>
                    )}
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={async () => {
                        setOptionsVisible(false);
                        setTimeout(() => setBlockModalVisible(true), 200);
                      }}
                    >
                      <Text style={styles.optionText}>차단하기</Text>
                    </TouchableOpacity>
                    <View style={styles.optionDivider} />
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={async () => {
                        setOptionsVisible(false);
                        navigation.navigate('ProfileViewScreen', { externalUserId: `userId-${profileUserId}` });
                      }}
                    >
                      <Text style={styles.optionText}>프로필{"\n"}보기</Text>
                    </TouchableOpacity>
                    <View style={styles.optionDivider} />
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={() => {
                        setOptionsVisible(false);
                        setTimeout(() => setRemoveModalVisible(true), 200);
                      }}
                    >
                      <Text style={styles.optionText}>채팅방{"\n"}나가기</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Pressable>
          </Modal>
        )}

        {/* 신고 모달 */}
          <Modal
            visible={reportModalVisible}
            transparent={true}
            onRequestClose={() => setReportModalVisible(false)}
          >
          <View style={styles.reportModalContainer}>
            <View style={styles.reportModalContent}>
              <Text style={styles.reportModalTitle}>신고하기</Text>
              <Text style={styles.reportTarget}>
                대상: {youData?.nickname} ({youData?.age}세)
              </Text>
              <TextInput
                style={styles.reportInput}
                placeholder="신고 내용을 입력하세요"
                value={reportContent}
                onChangeText={setReportContent}
              />
              <View style={styles.reportButtonsContainer}>
                <TouchableOpacity style={styles.reportButton} onPress={() => {setReportModalVisible(false); setReportContent('');}}>
                  <Text style={styles.reportButtonTextCancle}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reportButton, styles.reportButtonConfirm]} onPress={reportUser}>
                  <Text style={styles.reportButtonTextOk}>신고하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {leaveMeetingModalVisible && (
  <Modal
    visible={leaveMeetingModalVisible}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setLeaveMeetingModalVisible(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>모임 나가기</Text>
        <Text style={styles.modalMessage}>
          정말 모임을 나가시겠습니까? 나가시면 채팅 내역이 삭제됩니다.
        </Text>
        <View style={styles.modalButtonContainer}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: '#ccc' }]}
            onPress={() => setLeaveMeetingModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setLeaveMeetingModalVisible(false);
              handleLeaveMeeting(); // state의 meetingId 사용 (오류 해결)
            }}
          >
            <Text style={styles.modalButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
)}


          {/* 차단 모달 */}
          <Modal
            visible={blockModalVisible}
            transparent={true}
            onRequestClose={() => setBlockModalVisible(false)}
          >
          <View style={styles.blockModalContainer}>
            <View style={styles.blockModalContent}>
              <Text style={styles.blockModalTitle}>{youData?.nickname} 님을 차단할까요?</Text>
              <Text style={styles.blockInfo}>
                더보기 탭에서 차단 해제가 가능하고,{"\n"}채팅방은 삭제돼요.
              </Text>
              <View style={styles.reportButtonsContainer}>
                <TouchableOpacity style={styles.reportButton} onPress={() => {setBlockModalVisible(false)}}>
                  <Text style={styles.blockButtonTextCancel}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reportButton, styles.reportButtonConfirm]} onPress={handleBlockUser}>
                  <Text style={styles.blockButtonTextOk}>차단하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 채팅방 삭제 모달 */}
        <Modal
            visible={removeModalVisible}
            transparent={true}
            onRequestClose={() => setRemoveModalVisible(false)}
          >
          <View style={styles.removeModalContainer}>
            <View style={styles.removeModalContent}>
              <Text style={styles.removeModalTitle}>채팅을 종료할까요?</Text>
              <Text style={styles.removeInfo}>
                채팅내역이 삭제되고 되돌릴 수 없습니다.
              </Text>
              <View style={styles.reportButtonsContainer}>
                <TouchableOpacity style={styles.reportButton} onPress={() => {setRemoveModalVisible(false)}}>
                  <Text style={styles.removeButtonTextCancel}>아니요</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reportButton, styles.reportButtonConfirm]} onPress={removeChatRoom}>
                  <Text style={styles.removeButtonTextOk}>네</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 이미지 확대 모달 */}
        <Modal
          visible={isImageModalVisible}
          transparent={true}
          onRequestClose={closeImageModal}>
            {/* 닫기 버튼 */}
            {/* 닫기 버튼 */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: Platform.OS === 'android' ? 40 : 60, // iOS와 Android에서 상태바 높이를 고려
              right: 20,
              zIndex: 10,
              borderRadius: 20,
              padding: 10,
            }}
            onPress={() => closeImageModal()}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <ImageViewer
            imageUrls={modalImageUrls}
            enableSwipeDown={true}
            onSwipeDown={closeImageModal}
            renderIndicator={() => null} // 페이지 번호 제거
          />
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
  
}

const styles = StyleSheet.create({
  // 날짜 구분자 스타일
  dateSeparator: {
    alignSelf: 'center', // 중앙 정렬
    backgroundColor: '#fff', // 배경색
    borderRadius: 20, // 둥근 모서리
    paddingVertical: 5,
    paddingHorizontal: 15,
    marginVertical: 10, // 위아래 여백
  },
  dateText: {
    fontSize: 12,
    color: '#525252',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff', // 배경 흰색으로 변경
  },
  header: {
    height: Platform.OS === 'ios' ? 45 : 80, // 헤더 높이 줄이기
    backgroundColor: '#fff', // 헤더 배경 흰색
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 30, // iOS 상태바 고려
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    // paddingHorizontal: 15, // 필요 시 추가
  },
  backButton: {
    width: 40, // 버튼 크기 조정
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1, // 중앙 정렬을 위해 flex 설정
    fontSize: 18,
    color: '#000', // 헤더 타이틀 색상
    fontWeight: 'bold',
    textAlign: 'center',
  },
  moreButton: {
    width: 40, // 버튼 크기 조정
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 40,
    marginRight: 5,

  },
  messageContainer: {
    maxWidth: '70%',
    marginLeft: 2, // 닉네임을 약간 오른쪽으로 이동
  },
  myMessageContainer: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  nickname: {
    fontSize: 12,
    color: '#000',
    marginBottom: 2,
    marginLeft: 2, // 닉네임을 약간 오른쪽으로 이동
    marginBottom: Platform.OS === 'android' ? 0 : 0,
  },
  bubbleAndTime: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageBubble: {
    padding: Platform.OS === 'android' ? 10 : 10,
    paddingVertical: Platform.OS === 'android' ? 7 : 10,
    borderRadius: 10,
  },
  transparentProfileImage: {
    opacity: 0, // 투명 처리
    height:0,
  },
  myMessage: {
    backgroundColor: '#4E9FFF', // 내 채팅 색상 변경 (연한 파란색)
    borderTopRightRadius: 0,
    marginLeft: 5,
  },
  otherMessage: {
    backgroundColor: '#EFEFEF', // 상대방 채팅 색상 변경 (연한 회색)
    borderTopLeftRadius: 0,
    marginRight: 5,
  },
  messageText: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#fff',
  },
  messageTextOther: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#000',
  },
  messageTime: {
    fontSize: 12,
    color: '#555',
  },
  myMessageTime: {
    marginRight: 5,
  },
  otherMessageTime: {
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10, // 패딩을 늘려 입력 영역 높이 증가
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    textAlignVertical: 'center', // 텍스트를 세로로 가운데 정렬
    marginRight: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    maxHeight: 100, // 최대 높이 제한 (멀티라인 입력 시)
    height: 40, // 고정 높이 설정
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    
    paddingHorizontal: 15,
    height: 40, // 고정 높이 설정
    justifyContent: 'center', // 텍스트 중앙 정렬
    alignItems: 'center', // 텍스트 중앙 정렬
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  bottomSpacing: {
    height: Platform.OS === 'ios' ? 0 : 0,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    paddingVertical: 15,
    width: 120,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

  },
  optionButton: {
    paddingVertical: 0,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
  },
  noOverlay: {
    flex: 1,
  },
  blockModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  blockModalContent: {
    width: '80%',
    height: '30%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignSelf: 'center', // 부모 컨테이너의 중앙에 배치
  justifyContent: 'center', // 내부 요소 세로 중앙 정렬
  alignItems: 'center', // 내부 요소 가로 중앙 정렬
  },
  blockModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    height: '25%',
  },
  blockInfo: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    height: '35%',
  },
  blockButtonTextCancel: {
    color: '#999',
    fontSize: 18,
  },
  blockButtonTextOk: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  removeModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  removeModalContent: {
    width: '80%',
    height: '30%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignSelf: 'center', // 부모 컨테이너의 중앙에 배치
  justifyContent: 'center', // 내부 요소 세로 중앙 정렬
  alignItems: 'center', // 내부 요소 가로 중앙 정렬
  },
  removeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    height: '25%',
    //marginTop: Platform.OS === 'android' ? 0 : 15,
  },
  removeInfo: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    marginBottom: 10,
    textAlign: 'center',
    height: '35%',
  },
  removeButtonTextCancel: {
    color: '#999',
    fontSize: 18,
  },
  removeButtonTextOk: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reportModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  reportModalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reportTarget: {
    fontSize: 16,
    marginBottom: 10,
  },
  reportInput: {
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  reportButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: '#ddd',
  },
  reportButtonConfirm: {
    backgroundColor: colors.main,
  },
  reportButtonTextCancel: {
    color: '#999',
    fontSize: 16,
  },
  reportButtonTextOk: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 모달 오버레이 스타일
  // 모달 오버레이 스타일
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 배경 투명도 적용
  },
  modalContent: {
    width: '90%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 20, // 안드로이드 그림자
    shadowColor: '#000', // iOS 그림자
    shadowOffset: { width: 0, height: 2 }, // iOS 그림자
    shadowOpacity: 0.25, // iOS 그림자
    shadowRadius: 4, // iOS 그림자
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#FF7890',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoButton: {
    padding: 0,
    marginRight: 8,
  },
  photoIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 16,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 5,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
  },
});