import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, RefreshControl, Modal, Dimensions, Pressable, TextInput, Alert, ActivityIndicator, Image, DevSettings } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'; // 내비게이션 사용을 위해 추가
import EncryptedStorage from 'react-native-encrypted-storage';
import * as Location from 'expo-location';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import colors from '../styles/colors';
import FilterBar from '../FilterBar'; 
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width, height } = Dimensions.get('window');


const UserItem = React.memo(({ 
  item, 
  calculateDistance, 
  setSelectedImage,
  setVisible,
  location,
  navigation
}) => {

  const distance = calculateDistance(item.userListLatitude, item.userListLongitude);
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
  //console.log(item.userListLatitude);
  // 사용자 데이터가 없을 경우 기본값을 설정합니다.
  const user = item || {
    nickname: '탈퇴한 사용자',
    gender: 'unknown',
    age: '20',
    profileImageUrl: null,
  };

  const textColor =
    item.gender === 'female'
    ? styles.pinkText
    : item.gender === 'male'
    ? styles.blueText
    : styles.grayText; // unknown일 경우 회색
  const isDefaultProfileImage = item.profileImageUrl && item.profileImageUrl.includes('../assets');
  const localImages = {
    male: require('../../assets/images/men.png'),
    female: require('../../assets/images/women.png'),
  };
  
  return (
    
    <TouchableOpacity style={styles.postContainer} onPress={ async () => {
      const token = await EncryptedStorage.getItem('userToken');
      const decodedToken = decodeJWT(token);
      if (!decodedToken || !decodedToken.sub) {
        console.error('JWT에서 externalUserId를 추출할 수 없습니다.');
        return;
      }
      if (decodedToken.sub === item.externalUserId){
        navigation.navigate('ProfileViewScreen', { externalUserId: item.externalUserId, isChangeProfile: true });
      } else {
        navigation.navigate('ProfileViewScreen', { externalUserId: item.externalUserId });
      }
      
  }}
    activeOpacity={1}>
      <TouchableOpacity onPress={() => {
        setSelectedImage(item.profileImageUrl);
        if(!isDefaultProfileImage){
          setVisible(true);
        }
      }}>
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


      </TouchableOpacity>
      <View style={[styles.textContainer, isDefaultProfileImage && { marginLeft: 0 }]}>

      <View style={styles.userInfo}>
        <View style={styles.userInfoLeft}>
          <Text style={[styles.nicknameText]}>{item.nickname}</Text>
          <Text style={[styles.ageText, textColor]}> {item.age} </Text>
        </View>
        <View style={styles.userInfoRight}>
          <Text style={styles.grayText}>
            {(location.latitude === null && location.longitude === null)
              ? ' 로딩 중...' 
              : distance < 1 
                ? ' 1km' 
                : `${Math.round(distance)}km`}
          </Text>
          <Text style={styles.grayText}>{timeAgo(item.lastLogin)}</Text>
        </View>
      </View>

        <Text 
          style={styles.contentText} 
          numberOfLines={1} 
          ellipsizeMode="tail"
        >
          {item.status}
        </Text>


      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  if (
    prevProps.location.latitude !== nextProps.location.latitude ||
    prevProps.location.longitude !== nextProps.location.longitude
  ) {
    return false; // 다시 렌더링
  }
  return prevProps.item === nextProps.item; // 다른 prop이 같으면 렌더링 생략
});





const timeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);

  // 시간 차 계산 (초 단위)
  const diffInSeconds = Math.floor((now - date) / 1000);

  // 시간 차 계산 (일 단위)
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  // 3일이 넘는 경우 빈 문자열 반환
  //if (diffInDays > 5) {
  //  return '';
  //}

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

  // "전" 앞의 공백 제거 (문자열의 끝에서만 제거)
  formatted = formatted.replace(/\s전$/, '전');

  return formatted;
};













export default function NearbyScreen() {
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [loadingCandy, setLoadingCandy] = useState(false);
  const [remainingCandy, setRemainingCandy] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(false);
  const API_URL = Constants.expoConfig.extra.API_URL;
  //const API_URL = "http://192.168.0.2:5000";
  const [users, setUsers] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const flatListRef = useRef(null);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation(); // 내비게이션 훅 사용
  const route = useRoute();
  const [lastDistance, setLastDistance] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [lastLogin, setLastLogin] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState({
    gender: 'all',   // 성별 필터
    sort: 'time',    // 정렬 기준 필터
  });
  const [filters, setFilters] = useState(null); // 필터 상태

  const applyFilters = (selectedFilters) => {
    setFilters(selectedFilters); // 필터 상태 업데이트
    console.log('친구탭 적용된 필터:', selectedFilters);

    // 여기에 필터를 기준으로 데이터를 다시 요청하는 로직 추가
    fetchUsers(selectedFilters);
  };

  // 거리 계산 함수 수정
  const calculateDistance = useCallback((dataLatitude, dataLongitude) => {
    if (location.latitude === null || location.longitude === null) {
      return null;
    }
    //console.log(location.latitude);
    //console.log(dataLatitude);
    const R = 6371; // 지구 반지름 (단위: km)
    const toRad = (value) => (value * Math.PI) / 180; // 도(degree)를 라디안(radian)으로 변환
  
    const lat1 = toRad(location.latitude);
    const lon1 = toRad(location.longitude);
    const lat2 = toRad(dataLatitude);
    const lon2 = toRad(dataLongitude);
    
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    const distance = R * c; // 결과 단위: km

    return distance;
  }, [location]);


  // 필터 값 변경 함수
const handleFilterChange = (type, value) => {
  setSelectedFilter((prevFilter) => ({
    ...prevFilter,
    [type]: value,
  }));

};

useEffect(()=> {
  if(initialized === true){
    //fetchUsers(selectedFilter);
    //console.log("필터 눌림");
  }
}, [selectedFilter]);


const loadMoreUsers = async (filters, lastDistance, lastLogin) => {
  try {
    setLoading(true);
    console.log("ㅅㅂ?", lastLogin);
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
      return;
    }

    const response = await fetch(`${API_URL}/api/users/get-more-user?ageRange1=${filters.ageRange[0]}&ageRange2=${filters.ageRange[1]}&gender=${filters.gender}&sort=${filters.sort}&lastDistance=${lastDistance}&lastLogin=${lastLogin}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    //console.log(response);

    if (response.ok) {
      setLoading(false);
      const data = await response.json();

      const cal = calculateDistance(data[data.length-1]?.userListLatitude, data[data.length-1]?.userListLongitude);
      
      if(!isNaN(cal)){
        setLastDistance(cal);
        console.log("다음 데이터에 요청할 현재 데이터의 마지막 거리:", cal * 0.9);
      } else if(isNaN(cal)) {
        setLastDistance(0);
      }

      //console.log("뒤에서 두번째 로그인 시간", data[data.length-2]?.lastLogin);
      if(data[data.length-2]?.lastLogin){
        setLastLogin(data[data.length-2]?.lastLogin);
      }

      setUsers((prevUsers) => {
        // data에서 id가 중복되지 않은 사용자만 필터링
        const newUsers = data.filter(newUser => !prevUsers.some(existingUser => existingUser.id === newUser.id));
        return [...prevUsers, ...newUsers];
      });
      
      //console.log(additionalPosts.user.id);
    } else {
      console.log('추가 유저를 가져오는 데 실패했습니다.');
      setLoading(false);
    }
  } catch (error) {
    console.error('추가 유저를 로드 중 오류 발생:', error);
    setLoading(false);
  } finally{
    setRefreshing(false);
  }
};


// 유저들 불러오기
const fetchUsers = async (filters) => {
  console.log("유저 호출됨. 필터:",filters);
  //console.log("마지막거리: ", lastDistance);
  try {
    setLoading(true);
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
      return;
    }
    const response = await fetch(`${API_URL}/api/users/get-user?ageRange1=${filters.ageRange[0]}&ageRange2=${filters.ageRange[1]}&gender=${filters.gender}&sort=${filters.sort}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    //console.log(response);
    if (response.ok) {
      setLoading(false);
      const data = await response.json();

      const cal = calculateDistance(data[data.length-1]?.userListLatitude, data[data.length-1]?.userListLongitude);

      if(!isNaN(cal)){
        setLastDistance(cal);
        console.log("다음 데이터에 요청할 현재 데이터의 마지막 거리:", cal * 0.9);
      } else if(isNaN(cal)) {
        setLastDistance(0);
      }
      
      console.log("뒤에서 두번째 로그인 시간", data[data.length-2]?.lastLogin);
      setLastLogin(data[data.length-2]?.lastLogin);

      setUsers(data);
      setLocation({ latitude: data[0]?.latitude, longitude: data[0]?.longitude });



    } else if(response.status === 401){
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
      return;
    }  else {
      setLoading(false);
      console.error('게시물을 가져오는 데 실패했습니다.');
    }
  } catch (error) {
    setLoading(false);
    console.error('게시물을 가져오는 중 오류 발생:', error);
  } finally {
    setRefreshing(false); // 요청이 끝난 후 refreshing을 false로 설정
    setLoading(false);
  }
};


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
      console.log("발동됨 업데이트 로케이션");
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
      //console.log(location);
      // 위치 정보 서버로 전송
      const token = await EncryptedStorage.getItem('userToken');


      await fetch(`${API_URL}/api/users/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });
    } catch (error) {
      console.error('위치 정보 업데이트 중 오류 발생 nearby:', error);
    }
  };

  const fetchMyLocation = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');

      const response = await fetch(`${API_URL}/api/users/myLocation`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("마이로케이션",data);
        if (data) {
          const latitude = data.latitude;
          const longitude = data.longitude;
          //console.log("?", latitude);
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

useFocusEffect( 
    useCallback( () => {
      checkToken();
      }, [])
  );

  
      const checkToken = async () => {
        try {
          const token = await EncryptedStorage.getItem('userToken');
          if (token) {
            const response = await fetch(`${API_URL}/api/users/update-login-time`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (response.ok) {
              console.log("접속로그 저장됨");
            }

        }
      } catch (error) {
          console.error('Token check failed:', error);
        }
      };
  
      
  useFocusEffect( 
    useCallback( () => {
      //updateLocation();
      //console.log("시도 일어남");
      if(users.length === 0 && loading === false && location.latitude === null && initialized === false){
        setInitialized(true);
        updateLocation(); // 위치 정보 업데이트(초기 1번)
        //fetchUsers(selectedFilter);     // 게시글 불러오기(초기 1번)
        fetchMyLocation();
        console.log("여기?");
        setLoading(true);
        }
      }, [users])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      // 기본 탭 이동 동작을 유지하려면 아래를 주석 해제
      // e.preventDefault();
      setLoading(true);
      //console.log("시발");
      fetchUsers(filters);     // 게시글 불러오기
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      console.log("탭 버튼 눌림 감지");

    });

    return unsubscribe; // 컴포넌트 언마운트 시 이벤트 리스너 정리
  }, [navigation, filters]);


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers(filters);     // 게시글 불러오기
  }, [filters]);

  const handleMorePress = useCallback((user, event) => {
    setOptionsVisible(true);
    setSelectedUser(user);
  
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
        reportedUserId: selectedUser.id, // 
        reportContent, // 신고 작성 내용
        status: selectedUser.status,
        reportedExternalUserId: selectedUser.externalUserId
      };

      const isMyPost = await isMe(selectedUser, token); // `await`로 결과 처리
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
  
      const isMyPost = await isMe(selectedUser, token); // `await`로 결과 처리
      if (isMyPost) {
        setOptionsVisible(false);
        return;
      }

      const blockData = {
        externalUserId: selectedUser.externalUserId, // 차단할 사용자의 externalUserId
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



  const modalStyle = useMemo(() => ({
    top: modalPosition.y - 45,
    left: modalPosition.x - 115,
  }), [modalPosition]);
  







  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      )}


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
                onPress={async () => {
                  if(!messageContent){
                    Alert.alert('쪽지 내용을 한 글자 이상 작성해주세요.');
                  }
                  else{
                    // 테스트를 위한 보내기 동작
                    const token = await EncryptedStorage.getItem('userToken');
                    if (!token) {
                      Alert.alert("다시 로그인 해주세요.");
                      navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
                      return;
                    }

                    const isMyPost = await isMe(selectedRecipient, token); // `await`로 결과 처리
                    //console.log(selectedPost);
                    if(!isMyPost){
                      handleSendMessage();
                      setMessageModalVisible(false);
                      setMessageContent('');
                    }
                    else{
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
      </Modal>

      <FlatList
        data={users}
        renderItem={({ item }) => (
          <UserItem
            item={item}
            calculateDistance={calculateDistance}
            setSelectedImage={setSelectedImage}
            setVisible={setVisible}
            location={location}
            navigation={navigation}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        windowSize={30} // 화면에 보이는 영역 기준 추가로 로드할 영역
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        removeClippedSubviews={true}
        ref={flatListRef} // FlatList에 ref 연결
        //ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => loadMoreUsers(filters, lastDistance, lastLogin)} // 끝부분에 도달했을 때 호출
        onEndReachedThreshold={0.2} // 80% 지점에서 호출
      />

      <FilterBar applyFilters={applyFilters} showWriteButton={false} />





      <Modal
						visible={visible}
						transparent={true}
						onRequestClose={() => setVisible(false)}
					>
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
						onPress={() => setVisible(false)}
					>
						<Ionicons name="close" size={24} color="white" />
					</TouchableOpacity>

						<ImageViewer
							imageUrls={[{ url: selectedImage }]} // 이미지 리스트 전달 (배열 형태로 수정)
							enableSwipeDown={true} // 스와이프 다운으로 닫기
							onSwipeDown={() => setVisible(false)} // 닫기 핸들러
              renderIndicator={() => null} // 페이지 번호 제거
							
						/>
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
              대상: {selectedUser?.nickname} ({selectedUser?.age}세)
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
                  const isMyPost = await isMe(selectedUser, token); // `await`로 결과 처리
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
                  const isMyPost = await isMe(selectedUser, token); // `await`로 결과 처리
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
  emptySpace: {
    width: width * 0.00,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    
  },
  filterSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 0.4,
  },
  filterButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    //paddingVertical: Platform.OS === 'android' ? height * 0.0085 : height * 0.0103,
    position: 'relative', // 절대 위치를 위한 상대 위치 설정
    height: height * 0.035,
  },
  smallButton: {
    flex: 0.5, // 폭을 줄여서 오른쪽으로 몰아넣기
  },
  selectedButtonBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2, // 보더 두께
    backgroundColor: colors.main, // 보더 색상
  },
  buttonText: {
    color: '#999999',
    fontSize: height * 0.018,
    fontWeight: 'bold',
  },
  selectedButtonText: {
    color: colors.main,
  },
  ///////////////////////////////
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 37,
    paddingBottom: Platform.OS === 'android' ? 60 : 60,
  },
  postContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    width: '100%',
    marginTop: 16,
  },
  profileImage: {
    width: Platform.OS === 'android' ? 40 : 50,
    height: Platform.OS === 'android' ? 40 : 50,
    borderRadius: 14,
    marginRight: 7,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,                //안쓰이는듯?
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  textContainer: {
    flex: 1,
  },
  contentText: {
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
    fontSize: 13,
    marginBottom: -3,
    marginTop: 10,
    lineHeight: Platform.OS === 'android' ? 23.5 : 0,
    color: '#949494',
    marginRight: 40,
  },
  grayText: {
    fontSize: width * 0.028,
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
    color: '#ADADAD',
    marginBottom: Platform.OS === 'android' ? 0 : 2,
  },
  grayTextMSG: {
    color: '#888',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 좌우 끝으로 정렬
    width: '100%',
    marginBottom: Platform.OS === 'android' ? -15 : -5,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoRight: {
    alignItems: 'center', // 오른쪽 끝 정렬
    marginBottom: -15,
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
    fontSize: width * 0.045,
    color: colors.main, // 파란색 텍스트
    fontWeight: 'bold',
  },
  nicknameText: {
    fontSize: 13,
    //fontWeight: '400',
    //marginHorizontal: width * 0.01,
    color: '#000',
    //marginBottom: -8,
    //marginRight: width * 0.01,
    //lineHeight: 1,
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  ageText: {
    fontSize: 13,
    //marginRight: width * 0.01,
    //marginTop: 1,
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
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
    paddingLeft:1,
    paddingTop:15,
    paddingBottom:15,
    marginRight: 7,
  },
  moreButtonImage: {
    width: 19,
    height: 19,
  },
  postImage: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: 5,
    marginRight:5,
  },
  writeButton: {
    backgroundColor: colors.main,
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
    backgroundColor: colors.main,
    borderRadius: 5,
    zIndex: 1,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalImage: {
    width: width * 0.8,
    height: width * 1.85,
    resizeMode: 'contain',
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    backgroundColor: colors.main,
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
  
});
