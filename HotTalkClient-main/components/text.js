import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, Modal, Dimensions, Pressable, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Portal } from 'react-native-paper';





const { width, height } = Dimensions.get('window');

const timeAgo = (timestamp) => {
  return formatDistanceToNow(new Date(timestamp), { locale: ko, addSuffix: true });
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [location, setLocation] = useState(null); // 위치 정보를 담는 상태
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [remainingCandy, setRemainingCandy] = useState(0);
  const [loadingCandy, setLoadingCandy] = useState(false);
  const API_URL = Constants.expoConfig.extra.API_URL;
  //console.log(API_URL);





  // 거리 계산 함수 수정
  const calculateDistance = useCallback((postLatitude, postLongitude) => {
    if (!location) return null;
    const latDiff = Math.abs(location.latitude - postLatitude);
    const lonDiff = Math.abs(location.longitude - postLongitude);
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // 단위: km
  }, [location]);
  

  const fetchRemainingCandy = async () => {
    try {
      setLoadingCandy(true); // 로딩 시작
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      const response = await fetch(`${API_URL}/api/users/get-candy`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        setRemainingCandy(data.candy);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        const errorData = await response.json();
        Alert.alert('실패', errorData.message || '잔여 포인트를 불러오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('잔여 포인트 불러오기 오류:', error);
      Alert.alert('오류', '잔여 포인트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingCandy(false); // 로딩 종료
    }
  };
  


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
      setLocation({ latitude, longitude });

      // 위치 정보 서버로 전송
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
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
      console.error('위치 정보 업데이트 중 오류 발생:', error);
    }
  };


  // 게시글 불러오기 (초기 로드 시 한 번만 호출)
  // 게시글 불러오기 (초기 로드 시 한 번만 호출)
  const fetchPosts = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const response = await fetch(`${API_URL}/api/posts/get-post`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        console.error('게시물을 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('게시물을 가져오는 중 오류 발생:', error);
    } finally {
      setRefreshing(false); // 요청이 끝난 후 refreshing을 false로 설정
    }
  };

  const fetchMyLocation = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
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
        //console.log("마이로케이션",data);
        if (data) {
          const latitude = data.latitude;
          const longitude = data.longitude;
          setLocation({ latitude: latitude, longitude: longitude });
          //console.log("서버에서 가져온 내위치:", location);
        } 
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      } 
    }
    catch (error) {
      console.error('내 위치를 가져오는 중 오류 발생:', error);
    }
  }



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
  

  const checkSanctionStatus = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      const response = await fetch(`${API_URL}/api/sanction/check-sanction`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const sanctionData = await response.json();

  
        if (sanctionData.isSanctioned) {
          navigation.reset({
              index: 0,
              routes: [
                  {
                      name: 'SanctionScreen',
                      params: {
                          reason: sanctionData.reason || '정보 없음',
                          endTime: sanctionData.endTime || '정보 없음',
                      },
                  },
              ],
          });
      }
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      else {
        console.error('제재 상태를 확인하는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('제재 상태 확인 중 오류 발생:', error);
    }
  };

  useEffect(() => {
    checkSanctionStatus();
    updateLocation(); // 위치 정보 업데이트
    if(!posts){
      fetchPosts();     // 게시글 불러오기
    }
    fetchMyLocation();
  }, []);



  useFocusEffect(
    useCallback(() => {
      //checkSanctionStatus();
      fetchPosts();     // 게시글 불러오기
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();     // 게시글 불러오기
  }, []);

  const handleFilterPress = (filterType) => {
    setSelectedFilter(filterType);
  };

  const handleWritePress = () => {
    navigation.navigate('WriteScreen');
  };

  const handleMorePress = useCallback((post, event) => {
    setOptionsVisible(true);
    setSelectedPost(post);
  
    const { pageX, pageY } = event.nativeEvent;
    setModalPosition({ x: pageX, y: pageY });
  
    // 복잡한 로직을 비동기 처리로 분리

  }, []);
  

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


  const reportUser = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const reportData = {
        reportedUserId: selectedPost.user.id, // 
        reportContent, // 신고 작성 내용
        postId: selectedPost.post.id, // 신고 대상 게시물 ID
        postText: selectedPost.post.content,
      };

      const isMyPost = await isMe(selectedPost.user, token); // `await`로 결과 처리
      if (isMyPost) {
        setOptionsVisible(false);
        setReportModalVisible(false);
        setReportContent(null);
        return;
      }


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
        Alert.alert("알림", "접수되었습니다.");
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
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      const isMyPost = await isMe(selectedPost.user, token); // `await`로 결과 처리
      if (isMyPost) {
        setOptionsVisible(false);
        return;
      }

      const blockData = {
        externalUserId: selectedPost.user.externalUserId, // 차단할 사용자의 externalUserId
        myUserId: token, // 내 사용자 ID
      };
  
      const response = await fetch(`${API_URL}/api/block/block-user`, {
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
        closeOptionsModal();
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

  const isMe = async(user, token) => {

    // JWT에서 externalUserId 추출
    const decodedToken = decodeJWT(token);
    if (!decodedToken || !decodedToken.sub) {
      console.error('JWT에서 externalUserId를 추출할 수 없습니다.');
      return;
    }

    const myExternalUserId = decodedToken.sub;
    //console.log("나의 externalUserId:", myExternalUserId);

    // 본인 글인지 확인
    if (myExternalUserId === user.externalUserId) {
      closeOptionsModal();
      alert("자신의 게시물입니다.");
      return true; // 자신의 게시물임
    }

  return false; // 자신의 게시물이 아님

  }

  const handleSendMessage = async () => {
    try {
      // 사용자 토큰 가져오기
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      console.log("수신자 ID: ", selectedRecipient.id);
      console.log("메시지 내용: ", messageContent);
      console.log("발신자 토큰: ", token);
  
      const sendMessageData = {
        recipientId: selectedRecipient.id, // 상대방 ID
        messageContent: messageContent,   // 보낸 메시지 내용
      };
  
      // 서버로 데이터 전송
      const response = await fetch(`${API_URL}/api/userChatRooms/first-send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sendMessageData),
      });
  
      if (response.ok) {
        const responseText = await response.text();
        console.log("메시지 전송 성공:", responseText);
      } 
      else if (response.status === 400) {
        const errorData = await response.text();
        Alert.alert("알림",errorData); // "쪽지를 보낼 수 없는 상대입니다." 메시지 출력
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      } 
      else {
        console.error("메시지 전송 실패:", response.statusText);
        alert("쪽지를 보낼 수 없습니다.");
      }
    } catch (error) {
      console.error('메시지 전송 중 오류 발생:', error);
    }
  };

  const loadMorePosts = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      // 가장 과거의 포스트 ID 가져오기
      const lastPostId = posts.length > 0 ? posts[posts.length - 1].post.id : null;
      console.log(lastPostId);
      const response = await fetch(`${API_URL}/api/posts/get-more-post?lastPostId=${lastPostId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const additionalPosts = await response.json();
        setPosts((prevPosts) => [...prevPosts, ...additionalPosts]);
        //console.log(additionalPosts.post.id);
      } else {
        console.error('추가 게시물을 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('추가 게시물 로드 중 오류 발생:', error);
    }
  };
  

  const modalStyle = useMemo(() => ({
    top: modalPosition.y - 45,
    left: modalPosition.x - 115,
  }), [modalPosition]);
  
  
  const PostItem = React.memo(({ item, calculateDistance }) => {
    const distance = calculateDistance(item.postLatitude, item.postLongitude);
    // 사용자 데이터가 없을 경우 기본값을 설정합니다.
    const user = item.user || {
      nickname: '탈퇴한 사용자',
      gender: 'unknown',
      age: '20',
      profileImageUrl: null,
    };
  
    const textColor =
    user.gender === 'female'
      ? styles.pinkText
      : user.gender === 'male'
      ? styles.blueText
      : styles.grayText; // unknown일 경우 회색
    const isDefaultProfileImage = user.profileImageUrl && user.profileImageUrl.includes('default_profile_image');

    return (
      <View style={styles.postContainer}>
        {!isDefaultProfileImage && user.profileImageUrl ? (
          <TouchableOpacity onPress={() => {
            setSelectedImage(user.profileImageUrl);
            setVisible(true);
          }}>
            <Image source={{ uri: user.profileImageUrl }} style={styles.profileImage} />
          </TouchableOpacity>
        ) : null}
        <View style={[styles.textContainer, isDefaultProfileImage && { marginLeft: 0 }]}>
          <Text style={styles.contentText}>{item.post.content}</Text>
          <View style={styles.userInfo}>
            <Text style={styles.grayText}>{timeAgo(item.post.createdAt)}</Text>
            <Text style={[styles.nicknameText, textColor]}>{user.nickname}</Text>
            <Text style={[styles.ageText, textColor]}>{user.age}세</Text>
            <Text style={styles.grayText}>
              {distance === null 
                ? '로딩 중...' 
                : distance < 1 
                  ? '1km 미만' 
                  : `${Math.round(distance)} km`}
            </Text>
          </View>
        </View>
        <View style={styles.imageContainer}>
          <TouchableOpacity 
            style={styles.moreButton} 
            onPress={(e) => handleMorePress(item, e)}
          >
            <Image source={require('../../assets/images/moreY.png')} style={styles.moreButtonImage} />
          </TouchableOpacity>
          {item.post.imageUrl && (
            <TouchableOpacity onPress={() => {
              setSelectedImage(item.post.imageUrl);
              setVisible(true);
              
            }}>
              <Image source={{ uri: item.post.imageUrl }} style={styles.postImage} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.messageButton}
            onPress={async () => {
              setSelectedRecipient(user); // 게시물의 사용자 데이터 설정
              const token = await EncryptedStorage.getItem('userToken');
              if (!token) {
                Alert.alert("다시 로그인 해주세요.");
                navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
                return;
              }
              const isMyPost = await isMe(user, token); // `await`로 결과 처리
              if (!isMyPost) {
                await fetchRemainingCandy(); // 잔여 포인트 불러오기 함수 호출
                setMessageModalVisible(true); // 모달 표시
              }
            }}
          >
            <Text style={styles.messageButtonText}>쪽지{"\n"}쓰기</Text>
          </TouchableOpacity>


        </View>
      </View>
    );
  }, (prevProps, nextProps) => {
    return prevProps.item === nextProps.item; // 아이템이 변경되지 않으면 렌더링 방지
  });
  

  return (
    <View style={styles.container}>
      <Portal>
        {/* 쪽지 모달 */}
      <Modal
        visible={messageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 모달 헤더 */}
            <View style={styles.modalHeader}>
              <Image
                source={require('../../assets/images/message2.png')} // 쪽지 아이콘 이미지 경로
                style={styles.modalIcon}
              />
              <Text style={styles.modalTitle}>쪽지 보내기</Text>
            </View>
            
            {/* 수신자 정보 */}
            <View style={styles.recipientContainer}>
              {/* 성별에 따라 색상 적용 */}
              <Text style={[styles.recipientName, selectedRecipient?.gender === 'male' ? styles.blueTextMSG : selectedRecipient?.gender === 'female' ? styles.pinkTextMSG : styles.grayTextMSG]}>
                {selectedRecipient?.nickname || '이름 없음'}
              </Text>
              <Text style={styles.recipientAge}>
                {selectedRecipient?.age ? `(${selectedRecipient.age}세)` : '나이 정보 없음'}
              </Text>
            </View>
            
            {/* 쪽지 내용 입력 */}
            <TextInput
              style={styles.modalInput}
              placeholder="쪽지 내용을 입력하세요"
              multiline
              value={messageContent}
              onChangeText={setMessageContent}
            />
            
            {/* 포인트 정보 */}
            <View style={styles.pointInfoContainer}>
              <Text style={styles.modalCost}>
                쪽지 당 70포인트 차감됩니다.
              </Text>
              <Text style={styles.remainingCandy}>
                잔여 포인트: 
                {loadingCandy ? (
                  <ActivityIndicator size="small" color="#FF69B4" />
                ) : (
                  <Text style={styles.candyHighlight}>{remainingCandy}포인트</Text>
                )}
              </Text>
            </View>
            
            {/* 버튼 */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setMessageModalVisible(false);
                  setMessageContent('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSend}
                onPress={() => {
                  if(!messageContent){
                    Alert.alert('쪽지 내용을 한 글자 이상 작성해주세요.');
                  }
                  else{
                    // 테스트를 위한 보내기 동작
                    handleSendMessage();
                    setMessageModalVisible(false);
                    setMessageContent('');
                  }
                  
                }}
              >
                <Text style={styles.modalButtonTextSend}>보내기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
      



      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostItem
            item={item}
            calculateDistance={calculateDistance}
          />
        )}
        keyExtractor={(item) => item.post.id.toString()}
        contentContainerStyle={styles.list}
        windowSize={10} // 화면에 보이는 영역 기준 추가로 로드할 영역
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMorePosts}>
            <Text style={styles.loadMoreButtonText}>더보기</Text>
          </TouchableOpacity>
        }
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, selectedFilter === 'all' && styles.selectedButton]}
          onPress={() => handleFilterPress('all')}
        >
          <Text style={[styles.buttonText, selectedFilter === 'all' && styles.selectedButtonText]}>전체</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, selectedFilter === 'distance' && styles.selectedButton]}
          onPress={() => handleFilterPress('distance')}
        >
          <Text style={[styles.buttonText, selectedFilter === 'distance' && styles.selectedButtonText]}>근처</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, selectedFilter === 'myPosts' && styles.selectedButton]}
          onPress={() => handleFilterPress('myPosts')}
        >
          <Text style={[styles.buttonText, selectedFilter === 'myPosts' && styles.selectedButtonText]}>My</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.writeButton]}
          onPress={handleWritePress}
        >
          <Text style={styles.buttonText2}>글쓰기</Text>
        </TouchableOpacity>
      </View>

      
      <Portal>
      <Modal
        visible={visible}
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.modalContainer} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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
              대상: {selectedPost?.user?.nickname} ({selectedPost?.user?.age}세)
            </Text>
            <TextInput
              style={styles.reportInput}
              placeholder="신고 내용을 입력하세요"
              value={reportContent}
              onChangeText={setReportContent}
            />
            <View style={styles.reportButtonsContainer}>
              <TouchableOpacity style={styles.reportButton} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.reportButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reportButton, styles.reportButtonConfirm]} onPress={reportUser}>
                <Text style={styles.reportButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 옵션 모달 */}
      {optionsVisible && (
        <Modal
          visible={optionsVisible}
          transparent={true}
          animationType="none"
          onRequestClose={closeOptionsModal}
        >
          <Pressable style={styles.noOverlay} onPress={closeOptionsModal}>
            
            <View style={[styles.optionsModal, modalStyle]}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={async() => {
                  const token = await EncryptedStorage.getItem('userToken');
                  if (!token) {
                    Alert.alert("다시 로그인 해주세요.");
                    navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
                    return;
                  }
                  const isMyPost = await isMe(selectedPost.user, token); // `await`로 결과 처리
                  if(!isMyPost){
                    setReportModalVisible(true);
                  }
                }}
              >
                <Text style={styles.optionText}>신고하기</Text>
              </TouchableOpacity>
              <View style={styles.optionDivider} />
                <TouchableOpacity style={styles.optionButton} onPress={async () => {
                  const token = await EncryptedStorage.getItem('userToken');
                  if (!token) {
                    Alert.alert("다시 로그인 해주세요.");
                    navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
                    return;
                  }
                  const isMyPost = await isMe(selectedPost.user, token); // `await`로 결과 처리
                  if(!isMyPost){
                    handleBlockUser();
                  }
                }}
                >
                  <Text style={styles.optionText}>차단하기</Text>
                </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
        
      )}
      </Portal>

    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    width: '100%',
    paddingHorizontal: 0,
  },
  postContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    width: '100%',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  textContainer: {
    flex: 1,
  },
  contentText: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 5,
  },
  grayText: {
    fontSize: 14,
    color: '#888',
  },
  grayTextMSG: {
    color: '#888',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  loadMoreButton: {
    width: '100%', // 가로로 꽉 차게 설정
    paddingVertical: 15, // 세로 여백
    alignItems: 'center', // 텍스트 가운데 정렬
    justifyContent: 'center',
    backgroundColor: '#f0f0f0', // 배경색
    borderTopWidth: 1, // 위쪽 경계선
    borderTopColor: '#ddd',
  },
  loadMoreButtonText: {
    fontSize: 16,
    color: '#007BFF', // 파란색 텍스트
    fontWeight: 'bold',
  },
  nicknameText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 6,
  },
  ageText: {
    fontSize: 14,
    marginRight: 6,
  },
  pinkText: {
    color: '#FF69B4',
  },
  pinkTextMSG: {
    color: '#FF69B4',
  },
  blueText: {
    color: '#007BFF',
  },
  blueTextMSG: {
    color: '#007BFF',
  },
  moreButton: {
    marginRight: 0,
    //padding: 10,
    paddingLeft:15,
    paddingTop:15,
    paddingBottom:15,
    marginRight: 8,
  },
  moreButtonImage: {
    width: 20,
    height: 20,
  },
  postImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight:5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0,
  },
  selectedButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF69B4',
  },
  buttonText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText2: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedButtonText: {
    color: '#FF69B4',
  },
  writeButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 5,
    marginHorizontal: 5,
    paddingHorizontal: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    position: 'relative',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    padding: 10,
    backgroundColor: '#FF69B4',
    borderRadius: 5,
    zIndex: 1,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.9,
    resizeMode: 'contain',
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  messageButton: {
    marginLeft: 0,
    width: 50,
    height: 50,
    backgroundColor: '#F0F0F0',
    borderColor: '#ccc',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  messageButtonText: {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
  },
  optionsModal: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    width: 120,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  optionButton: {
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
  },
  noOverlay: {
    flex: 1,
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
    backgroundColor: '#FF69B4',
  },
  reportButtonText: {
    color: '#000',
    fontSize: 16,
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
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333',
  },
  recipientAge: {
    fontSize: 16,
    color: '#666',
  },
  modalInput: {
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  pointInfoContainer: {
    marginBottom: 20,
  },
  modalCost: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  remainingCandy: {
    fontSize: 14,
    color: '#555',
  },
  candyHighlight: {
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#ddd',
  },
  modalButtonSend: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF69B4',
  },
  modalButtonTextCancel: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonTextSend: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  //위까지 모달
});
