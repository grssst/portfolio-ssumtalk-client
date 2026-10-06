import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ActivityIndicator, KeyboardAvoidingView, Text, Keyboard, TextInput, TouchableOpacity, FlatList, Modal, Platform, StyleSheet, Pressable, Image, Dimensions, ScrollView, Alert, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, CommonActions, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import ImageViewer from 'react-native-image-zoom-viewer';
import * as Location from 'expo-location';
import colors from './styles/colors';

const { width, height } = Dimensions.get('window');

const interests = [
  { id: 1, label: '💕진지한 연애' },
  { id: 2, label: '🚶‍♂️산책' },
  { id: 3, label: '👫동네 친구' },
  { id: 4, label: '🍺맥주' },
  { id: 5, label: '🍿영화' },
  { id: 6, label: '🥰캐주얼한 연애' },
  { id: 7, label: '📺넷플릭스' },
  { id: 8, label: '🏋️‍♀️운동' },
  { id: 9, label: '🎶음악 감상' },
  { id: 10, label: '✈️여행' },
  { id: 11, label: '🎮게임' },
  { id: 12, label: '📖독서' },
  { id: 13, label: '👩‍🍳요리' },
  { id: 14, label: '🚗드라이브' },
  { id: 15, label: '🎲보드게임' },
  { id: 16, label: '🍷술' },
  { id: 17, label: '😋맛집' },
  { id: 18, label: '🎤노래' },
  { id: 19, label: '☕카페' },
];

const timeAgo = (timestamp) => {
	const now = new Date();
	const date = new Date(timestamp);

	// 시간 차 계산 (초 단위)
	const diffInSeconds = Math.floor((now - date) / 1000);

	// 시간 차 계산 (일 단위)
	const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));



  // 1분 미만일 경우 초 단위로 반환
  if (diffInSeconds < 0) {
    return `${diffInSeconds}1초전`;
  }
  else if (diffInSeconds < 60) {
    return `${diffInSeconds}초전`;
  }

	// 1분 이상일 경우 기존 로직 적용
	let formatted = formatDistanceToNow(date, { locale: ko, addSuffix: true });

	// "약 " 제거 (문자열의 시작에서만 제거)
	formatted = formatted.replace(/^약\s/, '');



	return formatted;
};


export default function ProfileViewScreen() {
	const [loading, setLoading] = useState(false);
	const [image, setImage] = useState(null);
	const [image2, setImage2] = useState(null);
	const [image3, setImage3] = useState(null);
	const [nickname, setNickname] = useState('');
	const [beforeNickname, setBeforeNickname] = useState('');
	const [gender, setGender] = useState('');
	const [age, setAge] = useState('');
	const [status, setStatus] = useState('');
	const [myLocation, setMyLocation] = useState('');
	const [selectedInterestsKey, setSelectedInterestsKey] = useState([]); // 초기 상태를 빈 배열로 설정
	const [lastLogin, setLastLogin] = useState(null);
	const [imageList, setImageList] = useState([]);
	const [imageViewList, setImageViewList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
	const [isViewerVisible, setViewerVisible] = useState(false);
	const [reportModalVisible, setReportModalVisible] = useState(false);
	const [reportContent, setReportContent] = useState('');
	const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [viewerIndex, setViewerIndex] = useState(0);
	const navigation = useNavigation();
	const route = useRoute();
	const [location, setLocation] = useState({ latitude: null, longitude: null });
	const [otherLocation, setOtherLocation] = useState({ latitude: null, longitude: null });
	const [optionsVisible, setOptionsVisible] = useState(false);
	const [selectedPost, setSelectedPost] = useState(null);
	const [messageModalVisible, setMessageModalVisible] = useState(false);
	const [selectedRecipient, setSelectedRecipient] = useState(null);
	const [messageContent, setMessageContent] = useState('');
	const [remainingCandy, setRemainingCandy] = useState(0);
	const [loadingCandy, setLoadingCandy] = useState(false);


  const API_URL = Constants.expoConfig.extra.API_URL // API 엔드포인트
  //const API_URL = Constants.expoConfig.extra.API_URL;
	// route.params에서 externalUserId 가져오기
	const externalUserId = route.params?.externalUserId;
	const isChangeProfile = route.params?.isChangeProfile;

	
	useEffect(() => {
    // 이미지 배열 설정 (이미지가 없을 수도 있음)
    const images = [image, image2, image3].filter((img) => img !== null);
    setImageList(images);
  }, [image, image2, image3]);

	useEffect(() => {
		//console.log("selectedPost:", selectedPost);
	}, [selectedPost]);


  const handleScroll = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(newIndex);
  };

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

	//const distance = calculateDistance(item.postLatitude, item.postLongitude);
	const fetchRemainingCandy = async () => {
    try {
      setLoadingCandy(true); // 로딩 시작
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
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
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        const errorData = await response.json();
        Alert.alert('실패', errorData.message || '잔여 캔디를 불러오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('잔여 캔디 불러오기 오류:', error);
      Alert.alert('오류', '잔여 캔디를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingCandy(false); // 로딩 종료
    }
  };

	const getUserProfileView = async () => {
			const token = await EncryptedStorage.getItem('userToken');
			if (!token) {
					Alert.alert("다시 로그인 해주세요.");
					navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
					return;
			}
			const menImage = require('../assets/images/men.png');
			const womenImage = require('../assets/images/women.png');
			//console.log(externalUserId);
			const formData = new FormData();
    	formData.append('externalUserId', externalUserId);
			//console.log(formData);
			try {
					const response = await fetch(`${API_URL}/api/users/get-user-profile-view`, {
					method: 'POST',
					headers: {
							'Authorization': `Bearer ${token}`,
					},
					body: formData,
					});

					if(response.ok){
					const data = await response.json();
					setSelectedPost(data.otherUser);
					
					
					setNickname(data.otherUser.nickname);
					setAge(data.otherUser.age);
					setGender(data.otherUser.gender);
					
					setStatus(data.otherUser.status);
					setMyLocation(data.otherUser.myLocation);
					setOtherLocation({ latitude: data.otherUser.latitude, longitude: data.otherUser.longitude });
					setLocation({ latitude: data.myUser.latitude, longitude: data.myUser.longitude });
					setLastLogin(data.otherUser.lastLogin);
					setSelectedInterestsKey(data.otherUser.interestsKey?.split(',').map(Number));
					// 이미지 URL을 Image 컴포넌트에서 사용할 수 있도록 변환
					if (data.otherUser.profileImageUrl && data.otherUser.profileImageUrl != '../assets/images/men.png' && data.otherUser.profileImageUrl != '../assets/images/women.png') {
							setImage({ uri: data.otherUser.profileImageUrl });
					}
					else if(data.otherUser.profileImageUrl === '../assets/images/men.png'){
							setImage(null);

					}
					else if(data.otherUser.profileImageUrl === '../assets/images/women.png'){
							setImage(null);
					}

					// 이미지 URL을 Image 컴포넌트에서 사용할 수 있도록 변환
					if (data.otherUser.profileImageUrl2 && data.otherUser.profileImageUrl2 != '../assets/images/men.png' && data.otherUser.profileImageUrl2 != '../assets/images/women.png') {
							setImage2({ uri: data.otherUser.profileImageUrl2 });
					}
					else if(data.otherUser.profileImageUrl2 === '../assets/images/men.png'){
							setImage2(null);

					}
					else if(data.otherUser.profileImageUrl2 === '../assets/images/women.png'){
							setImage2(null);
					}

					// 이미지 URL을 Image 컴포넌트에서 사용할 수 있도록 변환
					if (data.otherUser.profileImageUrl3 && data.otherUser.profileImageUrl3 != '../assets/images/men.png' && data.otherUser.profileImageUrl3 != '../assets/images/women.png') {
							setImage3({ uri: data.otherUser.profileImageUrl3 });
					}
					else if(data.otherUser.profileImageUrl3 === '../assets/images/men.png'){
							setImage3(null);

					}
					else if(data.otherUser.profileImageUrl3 === '../assets/images/women.png'){
							setImage3(null);
					}
					setLoading(false);
					//console.log(data.profileImageUrl);
				} else if(response.status === 401){
					Alert.alert("다시 로그인 해주세요.");
					navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
					return;
				}
				else {
				//console.log(response.json);
				}



			} catch (error) {
					console.error('프로필 불러오기 오류:', error);
					Alert.alert('오류', '프로필을 불러오는 중 오류가 발생했습니다.');
			}
	}

	const distance = calculateDistance(otherLocation.latitude, otherLocation.longitude);

  useEffect( ()=> {
      getUserProfileView();
			updateLocation();
  }, []);

	// 이미지 클릭 핸들러
	const handleImagePress = (index) => {
		setViewerIndex(index);
		setViewerVisible(true);
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
			//console.log("위치 물리적으로 받아옴:", location);
			// 위치 정보 서버로 전송
			const token = await EncryptedStorage.getItem('userToken');

			//console.log("여기");
			await fetch(`${API_URL}/api/users/update-location`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({ latitude, longitude }),
			});
			//console.log("위치 정보 업데이트 됨");
		} catch (error) {
			console.error('위치 정보 업데이트 중 오류 발생:', error);
		}
	};

	useEffect(() => {
		// 이미지 배열을 이미지 뷰어 형식으로 변환
		const images = [image, image2, image3]
			.filter((img) => img !== null)
			.map((img) => ({ url: img.uri || img }));
	
		setImageViewList(images);
	}, [image, image2, image3]);
	

	const handleMorePress = useCallback(( event) => {
		setOptionsVisible(true);
		//setSelectedPost(post);
    
    if(Platform.OS === 'ios'){
      const { pageX, pageY } = event.nativeEvent;
		  setModalPosition({ x: pageX, y: pageY + 50});
    } else {
      const { pageX, pageY } = event.nativeEvent;
      setModalPosition({ x: pageX, y: pageY });
    }
		
		//console.log({ pageX, pageY });
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

	const handleBlockUser = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      const isMyPost = await isMe(selectedPost, token); // `await`로 결과 처리
      if (isMyPost) {
        setOptionsVisible(false);
        return;
      }

      const blockData = {
        externalUserId: selectedPost.externalUserId, // 차단할 사용자의 externalUserId
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
        Alert.alert('차단 완료', '사용자가 차단되었습니다. 차단 목록에서 해제 가능합니다.');
        closeOptionsModal();
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      } else if(response.status === 500){
        Alert.alert("존재 하지 않는 사용자입니다.");
        closeOptionsModal();
      }
      else {
        console.error('사용자를 차단하는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 차단 중 오류 발생:', error);
    }
  };

  const isMe = async(post, token) => {

    // JWT에서 externalUserId 추출
    const decodedToken = decodeJWT(token);
    if (!decodedToken || !decodedToken.sub) {
      console.error('JWT에서 externalUserId를 추출할 수 없습니다.');
      return;
    }

    const myExternalUserId = decodedToken.sub;
    //console.log("나의 externalUserId:", myExternalUserId);
 
    // 본인 글인지 확인
    if (myExternalUserId === post.externalUserId) {
      closeOptionsModal();
      alert("자신의 프로필입니다.");
      return true; // 자신의 게시물임
    }

  return false; // 자신의 게시물이 아님

  }

	const reportUser = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const reportData = {
				reportedUserId: selectedPost.id, // 
        reportContent, // 신고 작성 내용
        status: selectedPost.status,
        reportedExternalUserId: selectedPost.externalUserId
      };

      const isMyPost = await isMe(selectedPost, token); // `await`로 결과 처리
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

	const handleSendMessage = async () => {
    try {
      // 사용자 토큰 가져오기
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
			//console.log(selectedRecipient);
      //console.log("수신자 ID: ", selectedRecipient.id);
      //console.log("메시지 내용: ", messageContent);
      //console.log("발신자 토큰: ", token);
  
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
        Alert.alert("전송완료", "쪽지가 전송 되었습니다.");
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>로딩 중...</Text>
      </View>
    );
  }


	const modalStyle = useMemo(() => {
		if (modalPosition.x === 0 && modalPosition.y === 0) {
			return {
				opacity: 0, // 초기 위치 숨기기
			};
		}
		return {
			position: 'absolute',
			top: modalPosition.y - 45,
			left: modalPosition.x - 115,
			backgroundColor: 'white',
			borderRadius: 10,
			padding: 10,
			width: 120,
			elevation: 10,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 4,
			opacity: 1, // 위치 설정 후 표시
		};
	}, [modalPosition]);









  return(
		<View style={styles.container}>
			{loading && (
							<View style={styles.loadingOverlay}>
								<ActivityIndicator size="large" color="#FF69B4" />
							</View>
						)}
      {/* 헤더 */}
      <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Image source={require('../assets/images/leftArrow.png')} style={styles.backButton}/>
          </TouchableOpacity>
            <Text style={styles.headerTitle}></Text>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={(e) => handleMorePress(e)}
          >
            <Image
              source={require('../assets/images/moreWhite.png')}
              style={styles.moreIcon}
            />
          </TouchableOpacity>
        </View>

      {/* 스크롤 가능한 영역 */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 프로필 이미지 */}
        <View style={styles.imageContainer}>
				{imageList.length > 0 ? (
        // 이미지 슬라이더
        <>
          <FlatList
            data={imageList}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity activeOpacity={1} style={styles.imageWrapper} onPress={() => handleImagePress(index)}>
                <Image source={item} style={styles.profileImage} />
              </TouchableOpacity>
            )}
            onScroll={handleScroll}
          />



					{/* 이미지 뷰어 모달 */}
					<Modal
						visible={isViewerVisible}
						transparent={true}
						onRequestClose={() => setViewerVisible(false)}
					>
						{/* 닫기 버튼 */}
					<TouchableOpacity
						style={{
							position: 'absolute',
							top: 40, // iOS와 Android에서 상태바 높이를 고려
							right: 20,
							zIndex: 10,
							borderRadius: 20,
							padding: 10,
						}}
						onPress={() => setViewerVisible(false)}
					>
						<Ionicons name="close" size={24} color="white" />
					</TouchableOpacity>

						<ImageViewer
							imageUrls={imageViewList} // 이미지 리스트 전달
							enableSwipeDown={true} // 스와이프 다운으로 닫기
							onSwipeDown={() => setViewerVisible(false)} // 닫기 핸들러
							index={viewerIndex} // 선택한 이미지로 시작
							renderIndicator={(currentIndex, allSize) => (
								<View style={styles.pageIndicatorWrapperViewer}>
									<Text style={styles.pageIndicatorTextViewer}>
										{currentIndex} / {allSize}
									</Text>
								</View>
							)}
							
						/>
					</Modal>




          {/* 페이지 표시 */}
					<View style={styles.pageIndicatorWrapper}>
              <Text style={styles.pageIndicatorText}>
                {currentIndex + 1}/{imageList.length}
              </Text>
            </View>
        </>
      ) : (
        // 기본 이미지 렌더링
        gender === 'male' ? (
          <View style={styles.imageContainerMen}>
            <Image
              source={require('../assets/images/menForeground.png')}
              style={[styles.profileImageForegroundMen, styles.menBackground]}
            />
          </View>
        ) : gender === 'female' ? (
						<View style={styles.imageContainerWomen}>
							<Image
								source={require('../assets/images/womenForeground.png')}
								style={[styles.profileImageForegroundWomen, styles.womenBackground]}
							/>
						</View>
					) : (<View style={styles.grayBackground}>
						
					</View>) // male도 아니고 female도 아니면 아무것도 렌더링하지 않음
				)}
        </View>

        {/* 프로필 정보 */}
        <View style={styles.infoContainer}>
          <Text style={styles.nickname}>
						{!nickname ? "닉네임 로딩중" : nickname}
						
						{gender === 'male' ? <Text style={styles.ageTextMen}> {age}</Text> : <Text style={styles.ageTextWomen}> {age}</Text>}
					</Text>
          <Text style={styles.detailText}>
            <Image
              source={require('../assets/images/gps2.png')}
              style={styles.gpsImage}
            />
            {!myLocation ? " " : myLocation}
						{(location.latitude === null  && location.longitude === null)
              ? ' 로딩 중...' 
              : distance < 1 
                ? ', 1km 미만' 
                : `, ${Math.round(distance)}km`}
						</Text>
            
            <Text style={styles.detailText}>
						{timeAgo(lastLogin)} 접속

						</Text>
        </View>

        {/* 자기 소개 섹션 */}
        <View style={styles.introductionContainer}>
        <Text style={styles.introductionText}>
          {!status ? "자기소개 로딩중" : status}
        </Text>
        </View>

        {/* 관심사 섹션 */}
				<View style={styles.interestContainer}>
					<Text style={styles.interestTitle}>관심사</Text>
					<View style={styles.interestTags}>
						{selectedInterestsKey?.length > 0
							? selectedInterestsKey
									.map((key) => interests.find((interest) => interest.id === key)?.label) // id로 레이블 값 찾기
									.filter(Boolean) // undefined 제거
									.map((label, index) => (
										<View key={index} style={styles.interestTag}>
											<Text style={styles.interestText}>{label}</Text>
										</View>
									))
							: <Text style={styles.interestText}>관심사가 없습니다</Text>}
					</View>
				</View>


      </ScrollView>

      {/* 하단 고정 버튼 */}
      <TouchableOpacity
				style={styles.messageButton}
				onPress={async () => {
					if (isChangeProfile) {
						// 프로필 수정 로직
						navigation.navigate('ProfileScreen', {...route.params});
					} else {
						// 쪽지 보내기 로직

						setSelectedRecipient(selectedPost); // 게시물의 사용자 데이터 설정
						await fetchRemainingCandy(); // 잔여 포인트 불러오기 함수 호출
						setMessageModalVisible(true); // 모달 표시

					}
				}}
			>
				<Text style={styles.messageButtonText}>
					{isChangeProfile ? '프로필 수정' : '쪽지 보내기'}
				</Text>
			</TouchableOpacity>

		{/* 쪽지 모달 */}
    
    <Modal
  visible={messageModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setMessageModalVisible(false)}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    style={{ flex: 1 }}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // 필요 시 오프셋 조정
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 모달 헤더 */}
          <View style={styles.modalHeader}>
            <Image
              source={require('../assets/images/message2.png')}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>쪽지 보내기</Text>
          </View>
          
          {/* 수신자 정보 */}
          <View style={styles.recipientContainer}>
            <Text style={[
                styles.recipientName, 
                selectedRecipient?.gender === 'male' ? styles.blueTextMSG : selectedRecipient?.gender === 'female' ? styles.pinkTextMSG : styles.grayTextMSG
              ]}>
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
          
          {/* 캔디 정보 */}
          <View style={styles.pointInfoContainer}>
            <Text style={styles.modalCost}>
              쪽지 당 3캔디가 차감됩니다.
            </Text>
            <Text style={styles.remainingCandy}>
              잔여 캔디: 
              {loadingCandy ? (
                <ActivityIndicator size="small" color={colors.main} />
              ) : (
                <Text style={styles.candyHighlight}> {remainingCandy}개</Text>
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
              onPress={async () => {
                if (!messageContent) {
                  Alert.alert('쪽지 내용을 한 글자 이상 작성해주세요.');
                } else {
                  const token = await EncryptedStorage.getItem('userToken');
                  if (!token) {
                    Alert.alert("다시 로그인 해주세요.");
                    navigation.navigate("LoginScreen");
                    return;
                  }
                  const isMyPost = await isMe(selectedRecipient, token);
                  if (!isMyPost) {
                    handleSendMessage();
                    setMessageModalVisible(false);
                    setMessageContent('');
                  } else {
                    setMessageModalVisible(false);
                    setMessageContent('');
                  }
                }
              }}
            >
              <Text style={styles.modalButtonTextSend}>보내기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
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
							대상: {selectedPost?.nickname} ({selectedPost?.age}세)
						</Text>
						<TextInput
							style={styles.reportInput}
							placeholder="신고 내용을 입력하세요"
							value={reportContent}
							onChangeText={setReportContent}
						/>
						<View style={styles.reportButtonsContainer}>
							<TouchableOpacity style={styles.reportButton} onPress={() => setReportModalVisible(false)}>
								<Text style={styles.reportButtonText2}>취소</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.reportButton, styles.reportButtonConfirm]} onPress={reportUser}>
								<Text style={styles.reportButtonText}>확인</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* 옵션 모달 */}
			{optionsVisible && modalPosition.x !== 0 && modalPosition.y !== 0 && (
			<Modal
				visible={optionsVisible}
				transparent={true}
				animationType="none"
				onRequestClose={closeOptionsModal}
			>
				<Pressable style={{ flex: 1 }} onPress={closeOptionsModal}>
					<View style={modalStyle}>
						<TouchableOpacity
							style={styles.optionButton}
							onPress={async() => {
								const token = await EncryptedStorage.getItem('userToken');
								if (!token) {
									Alert.alert("다시 로그인 해주세요.");
									navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
									return;
								}
								const isMyPost = await isMe(selectedPost, token); // `await`로 결과 처리
								if(!isMyPost){
									
                  setOptionsVisible(false); // 기존 옵션 모달 닫기
                    setTimeout(() => setReportModalVisible(true), 200); // UI 업데이트 보장
								}
							}}
						>
							<Text style={styles.optionText}>신고하기</Text>
						</TouchableOpacity>
						<View style={styles.optionDivider} />
						<TouchableOpacity
							style={styles.optionButton}
							onPress={async () => {
								const token = await EncryptedStorage.getItem('userToken');
								if (!token) {
									Alert.alert("다시 로그인 해주세요.");
									navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
									return;
								}
								const isMyPost = await isMe(selectedPost, token); // `await`로 결과 처리
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
    </View>
  );
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
		zIndex: -1,
	},
	header: {
		position: 'absolute', // 헤더를 절대 위치로 설정
		top: 0,
		left: 0,
		right: 0,
		height: Platform.OS === 'android' ? width * 0.15 : 45, // 헤더 높이
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: Platform.OS === 'android' ? 35 : 0, // iOS 상태바 고려
		zIndex: 10, // 헤더를 이미지 위로 올리기
	},
	backButton: {
		width: width * 0.05, // 버튼 크기 조정
		height: width * 0.05,
		justifyContent: 'center',
		alignItems: 'center',
		resizeMode: 'contain',
		marginLeft: 7,
		//marginTop:
    marginTop: Platform.OS === 'android' ? 0 : 40,
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
    marginTop: Platform.OS === 'android' ? 0 : 80,
		marginRight: 7,
	},
	moreIcon: {
		width: 24,
		height: 24,
		resizeMode: 'contain',
	},
	gpsImage: {
		width: 11,
		height: 11,
		resizeMode: 'contain',
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 80, // 하단 버튼 공간 확보
	},
	imageContainer: {
		width: width,
		height: width, // 정사각형 이미지
		marginTop: Platform.OS === 'android' ? 35 : 0,
		//paddingTop: Platform.OS === 'android' ? 35 : 30,
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageContainerMen: {
		width: '100%',
		height: width, // 정사각형 이미지
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#EDEDED',
	},
	imageContainerWomen: {
		width: '100%',
		height: width, // 정사각형 이미지
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#EDEDED',
	},
	profileImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
		backgroundColor: '#999999',
	},
	profileImageForegroundMen: {
		width: '30%',
		height: '30%',
		resizeMode: 'cover',
	},
	profileImageForegroundWomen: {
		width: '30%',
		height: '30%',
		resizeMode: 'cover',
	},
	menBackground: {
		backgroundColor: '#EDEDED',
	},
	womenBackground: {
		backgroundColor: '#EDEDED',
	},
	ageTextMen: {
		fontSize: 20, // 나이 폰트 크기
		color: '#6A8FE0', // 나이 색상
	},
	ageTextWomen: {
		fontSize: 20, // 나이 폰트 크기
		color: '#FF9AD0', // 나이 색상
	},
	infoContainer: {
		padding: 20,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	nickname: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 10,
	},
	detailText: {
		fontSize: 16,
		color: '#666',
		marginBottom: 5,
	},
	interestContainer: {
		padding: 20,
		backgroundColor: '#FFFFFF',
	},
	interestTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 10,
	},
	interestTags: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	interestTag: {
		backgroundColor: '#F0F0F0',
		borderRadius: 20,
		paddingHorizontal: 15,
		paddingVertical: 8,
		marginRight: 10,
		marginBottom: 10,
	},
	interestText: {
		color: '#000000',
		fontSize: 14,
	},
	introductionContainer: {
		padding: 20,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	introductionText: {
		marginVertical: 10,
		fontSize: 16,
		lineHeight: 22,
	},
	messageButton: {
		position: 'absolute',
		bottom: 0,
		width: '100%',
		height: Platform.OS === 'android' ? 60 : 65,
		backgroundColor: '#FF7890',
		justifyContent: 'center',
		alignItems: 'center',
	},
	messageButtonText: {
		color: '#fff',
		fontSize: 18,
    marginBottom: Platform.OS === 'android' ? 0 : 10,
		fontWeight: 'bold',
	},
	imageWrapper: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',

  },
	pageIndicator: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
		
  },
	pageIndicatorWrapper: {
		position: 'absolute',
		bottom: 10, // 이미지 하단에서 살짝 띄움
		left: '50%',
		transform: [{ translateX: -width * 0.06 }], // 가로 중앙 정렬
		width: width * 0.12,
		height: width * 0.062, // 도형 높이 조정
		backgroundColor: 'rgba(0, 0, 0, 0.5)', // 더 진한 배경
		borderRadius: width * 0.035, // 완전한 원형
		justifyContent: 'center',
		alignItems: 'center',
	},
	pageIndicatorText: {
		color: '#fff',
		fontSize: width * 0.04, // 텍스트 크기 조정
		fontWeight: '400',
		lineHeight: width * 0.05, // 텍스트 세로 중앙 정렬
		letterSpacing: 1,
	},
	grayBackground: {
		width: '100%',
		height: width, // 정사각형 이미지
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#EDEDED',
	},
	pageIndicatorWrapperViewer: {
		position: 'absolute',
		bottom: 50, // 화면 하단에서 약간 띄움
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	pageIndicatorTextViewer: {
		color: '#fff',
		fontSize: 16,
		backgroundColor: 'rgba(0, 0, 0, 0.5)', // 반투명 배경
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 10,
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
    backgroundColor: colors.main,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
	reportButtonText2: {
    color: '#000',
    fontSize: 16,
  },
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
    backgroundColor: '#FF7890',
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
	loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // 전체 화면 덮기
    backgroundColor: 'rgba(0, 0, 0, 0)', // 반투명 배경
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // 로딩 화면이 플랫 리스트 위로 오도록 설정
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
});