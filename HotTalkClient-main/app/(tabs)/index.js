import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ToastAndroid, BackHandler, RefreshControl, Keyboard, KeyboardAvoidingView, TouchableWithoutFeedback, Modal, Dimensions, Pressable, TextInput, Alert, ActivityIndicator, Image, Platform, AppState } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, useIsFocused, useNavigationState } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { isLoading } from 'expo-font';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, onMessage, getToken } from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import colors from '../styles/colors';
import FilterBar from '../FilterBar'; 
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from 'react-native-image-zoom-viewer';
import RewardModal from '../RewardModal';
import EncryptedStorage from 'react-native-encrypted-storage';

const PostItem = React.memo(({ 
  item, 
  calculateDistance,
  handleMorePress, 
  fetchRemainingCandy,
  setSelectedRecipient,
  isMe,
  setMessageModalVisible,
  setSelectedImage,
  setVisible,
  location,
  navigation, // 네비게이션 객체 추가
  setViewerVisible,
}) => {

  const distance = calculateDistance(item.postLatitude, item.postLongitude);
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
  // 사용자 데이터가 없을 경우 기본값을 설정합니다.
  const post = item || {
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
  const isDefaultProfileImageAndMale = item.profileImageUrl && item.profileImageUrl.includes('../assets') && item.profileImageUrl.includes('/men');
  const isDefaultProfileImageAndFemale = item.profileImageUrl && item.profileImageUrl.includes('../assets') && item.profileImageUrl.includes('/women');
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

      <View style={styles.topRow}>
      {!isDefaultProfileImage && item.profileImageUrl ? (
        <View>
          <Image source={{ uri: item.profileImageUrl }} style={styles.profileImage} />
        </View>
      ) : isDefaultProfileImageAndMale ? (
        <Image source={require('../../assets/images/men.png')} style={styles.profileImage} />
        ) : isDefaultProfileImageAndFemale ? (
        <Image source={require('../../assets/images/women.png')} style={styles.profileImage} />
        ) : null
      }
        <View style={styles.infoContainer}>

          <View style={styles.nameAndAge}>
            <Text style={[styles.nicknameText]}>{item.nickname}</Text>
            <Text style={[styles.ageText, textColor]}>{item.age}</Text>
          </View>
          
          <View style={styles.locationAndTime}>
            <Text style={styles.grayText}>
              {item.myLocation || '지역 정보 없음'}
            </Text>
            <Text
              style={{
                fontSize: width * 0.028,
                color: '#888',
                marginLeft: 3, // 기본 왼쪽 마진
                marginRight: distance < 1 ? 1 : 3, // 1km일 때만 오른쪽 마진을 줄임
                fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
              }}
            >
              ·
            </Text>
            <Text style={styles.grayText}>
              { (location.latitude === null  && location.longitude === null)
                ? ' 로딩 중...' 
                : distance < 1 
                  ? '1km' 
                  : `${Math.round(distance)}km`},
            </Text>
            <Text style={styles.grayText}>  {timeAgo(item.createdAt)}</Text>
          </View>
          
        </View>
        <TouchableOpacity 
            style={styles.moreButton} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={(e) => handleMorePress(item, e)}
          >
            <Image source={require('../../assets/images/moreY.png')} style={styles.moreButtonImage} />
          </TouchableOpacity>


      
      </View>
        {/* 하단 텍스트 영역 */}
        <View style={styles.textContainer}>
          <Text style={styles.contentText}>{item.content}</Text>
        </View>

        {item.imageUrl ? (
        <TouchableOpacity
          style={styles.ImageViewer}
          onPress={() => {
            setSelectedImage(item.imageUrl);
            setViewerVisible(true);
          }}>
          <Image source={{ uri: item.imageUrl }} style={styles.contentImage} />
        </TouchableOpacity>) : null}

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


const { width, height } = Dimensions.get('window');

const timeAgo = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);

  // 시간 차 계산 (초 단위)
  const diffInSeconds = Math.floor((now - date) / 1000);

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
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [remainingCandy, setRemainingCandy] = useState(0);
  const [loadingCandy, setLoadingCandy] = useState(false);
  const API_URL = Constants.expoConfig.extra.API_URL;
  //const API_URL = "http://192.168.0.2:5000";
  const [exitApp, setExitApp] = useState(false);
  const [isViewerVisible, setViewerVisible] = useState(false);
  const isFocused = useIsFocused(); // 현재 화면이 활성화되어 있는지 확인
  const route = useRoute();
  const [filters, setFilters] = useState(null); // 필터 상태
  const [lastDistance, setLastDistance] = useState(0);
  const [dailyPostCount, setDailyPostCount] = useState(null);
  const [isRewardModalVisible, setRewardModalVisible] = useState(false);
  //console.log(API_URL);
  const flatListRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [locationLoaded, setLocationLoaded] = useState(true);
  //console.log(API_URL);
  
  const applyFilters = (selectedFilters) => {
    setFilters(selectedFilters); // 필터 상태 업데이트
    //console.log('적용된 필터:', selectedFilters);

    // 여기에 필터를 기준으로 데이터를 다시 요청하는 로직 추가
    fetchPosts(selectedFilters);
  };
  
  useEffect(() => {
    const checkAndRequestNotification = async () => {
      try {
        const pushPermissionsDenied = await AsyncStorage.getItem('notificationPermissionDenied');
  
        // ❗ 값이 없거나 true일 경우 (즉, 처음 앱 설치하거나 이전에 거부 안했던 경우)
        if (pushPermissionsDenied === null || pushPermissionsDenied !== 'true') {
          await requestNotificationPermission();
        }
  
      } catch (error) {
        console.error('푸시 알림 여부 가져오는 중 오류 발생', error);
      }
    };
  
    checkAndRequestNotification();
  }, []);
  

  const requestNotificationPermission = async () => {
    // 이미 결정된 상태라면 더 이상 묻지 않습니다.
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'undetermined') {
      console.log('푸시 알림 권한 이미 결정됨:', status);
      return;
    }
    // 아직 결정되지 않은 경우 사용자에게 묻습니다.
    Alert.alert(
      '푸시 알림 권한 요청',
      '푸시 알림을 허용하시겠습니까? (거부해도 진행됩니다.)',
      [
        {
          text: '거부',
          onPress: async () => {
            console.log('사용자가 푸시 알림 권한을 거부했습니다.');
            // 거부하더라도 push는 선택 사항이므로 아무 처리 없이 진행합니다.
            await AsyncStorage.setItem('notificationPermissionDenied', 'true');
          },
          style: 'cancel',
        },
        {
          text: '동의',
          onPress: async () => {
            try {
              const { status } = await Notifications.requestPermissionsAsync();
              if (status === 'granted') {
                console.log('푸시 알림 권한 허용됨');
                Alert.alert(
                  '알림 권한 허용됨',
                  '푸시 알림 권한이 허용되었습니다. 설정에서 해제할 수 있습니다.'
                );
              } else {
                console.log('푸시 알림 권한 거부됨');
              }
            } catch (error) {
              console.error('푸시 알림 권한 요청 오류:', error);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('위치 권한이 필요합니다.');
        }
      } catch (error) {
        console.error('위치 정보 업데이트 중 오류 발생 index:', error);
      }
    };
  
    requestPermissions();
  }, []);
  

  


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
    const backAction = () => {
      if (exitApp) {
        // 뒤로가기 버튼을 두 번 눌렀으므로 앱 종료
        BackHandler.exitApp();
      } else {
        // 첫 번째 버튼 클릭, 메시지 표시
        ToastAndroid.show('뒤로 버튼을 한 번 더 누르면 종료됩니다.', ToastAndroid.SHORT);
        setExitApp(true);

        // 일정 시간 후에 다시 false로 초기화
        setTimeout(() => setExitApp(false), 2000); // 2초 후 초기화
      }
      return true; // 기본 동작을 막기 위해 true 반환
    };

    // 현재 화면이 포커스된 상태에서만 이벤트 리스너 추가
    if (isFocused) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => backHandler.remove(); // 화면이 비활성화되면 리스너 제거
    }
  }, [isFocused, exitApp]);

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
  


  // 위치 정보 업데이트
  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('위치 권한이 부여되지 않았습니다.');
        setLocationLoaded(true);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const { latitude, longitude } = location.coords;
      //console.log('lati', latitude);
      //console.log("위치 물리적으로 받아옴:", location);
      
      // 플래그 저장
      await AsyncStorage.setItem('initialLocationReceived', 'true');
      setLocationLoaded(true);

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

      //console.log("여기");
      await fetch(`${API_URL}/api/users/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });
      //console.log("위치 정보 업데이트 됨", latitude, longitude);
    } catch (error) {
      console.error('위치 정보 업데이트 중 오류 발생 index:', error);
    }
  };

useEffect(() => {
  const checkInitialLocation = async () => {
    const isLoaded = await AsyncStorage.getItem('initialLocationReceived');
    if (isLoaded !== 'true') {
      setLocationLoaded(false);
    } else {
      setLocationLoaded(true);
    }
  };
  checkInitialLocation();
}, []);




  // 게시글 불러오기
  // 게시글 불러오기
  const fetchPosts = async (filters) => {
    //console.log("게시글 호출됨. 필터:", filters);
    try {
      setLoading(true);
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      const response = await fetch(`${API_URL}/api/posts/get-post?ageRange1=${filters.ageRange[0]}&ageRange2=${filters.ageRange[1]}&gender=${filters.gender}&sort=${filters.sort}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setLoading(false);
        const data = await response.json();
        //console.log(data[0]?.userLatitude);
        //console.log(data[0].dailyPostCount);
        //console.log(data[0]);
        setDailyPostCount(data[0].dailyPostCount);
        setPosts(data);
        setLocation({ latitude: data[0]?.userLatitude, longitude: data[0]?.userLongitude });

        const cal = calculateDistance(data[data.length-1]?.postLatitude, data[data.length-1]?.postLongitude);

        if(!isNaN(cal)){
          setLastDistance(cal);
          //console.log("다음 데이터에 요청할 현재 데이터의 마지막 거리:", cal * 0.9);
        } else if(isNaN(cal)) {
          setLastDistance(0);
        }
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
      setLoading(false);
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
        //console.log("마이로케이션",data);
        if (data) {
          const latitude = data.latitude;
          const longitude = data.longitude;
          setLocation({ latitude: latitude, longitude: longitude });
          //console.log("서버에서 가져온 내위치:", location);
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

  const app = getApp();
  const messagingInstance = getMessaging(app);
  

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
  //console.log('ㅅㅂ');

  const checkSanctionStatus = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
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
        //Alert.alert("다시 로그인 해주세요.");
        //navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      else if(response.status === 500){
        Alert.alert("유저 정보 확인 실패");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
      }
      else {
        console.error('제재 상태를 확인하는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('제재 상태 확인 중 오류 발생:', error);
    }
  };

  useFocusEffect( 
    useCallback( () => {
      //checkToken();
      if(posts.length === 0 && loading === false && location.latitude === null){
        setLoading(true);
        checkSanctionStatus();
        updateLocation(); // 위치 정보 업데이트(초기 1번)
        checkFcmToken();
        //fetchPosts({"ageRange": [20, 100], "gender": "all", "sort": "time"});     // 게시글 불러오기(초기 1번)
        //console.log('fetchPosts호출');
        //fetchMyLocation();
        setRewardModalVisible(true);
        
        }
      }, [posts])
  );
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
  
      


  // 최상위 라우트들의 state
  const navigationState = useNavigationState((state) => state);

  // 현재 액티브한 route 이름을 재귀적으로 찾아내는 함수
  const getActiveRouteName = (navState) => {
    if (!navState || !navState.routes) return '';
    const route = navState.routes[navState.index];

    // 자식 Navigator가 있다면, 깊이 들어가서 계속 탐색
    if (route.state) {
      return getActiveRouteName(route.state);
    }
    return route.name;
  };

  const activeRouteName = getActiveRouteName(navigationState);
  const activeRouteNameRef = useRef(activeRouteName);
  //console.log(activeRouteName);

  // activeRouteName이 변경될 때마다 ref를 업데이트
  useEffect(() => {
    activeRouteNameRef.current = activeRouteName;
  }, [activeRouteName]);

  useEffect(() => {

    const unsubscribe = onMessage(messagingInstance, async (remoteMessage) => {
    const currentRoute = activeRouteNameRef.current;
    console.log('포그라운드 메시지:', remoteMessage);
    //console.log('현재 스크린:', currentRoute);
    // 알림 핸들러 설정
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true, // 포그라운드 상태에서 알림을 표시
        shouldPlaySound: true, // 소리 재생 여부
        shouldSetBadge: false, // 앱 아이콘 배지 설정 여부
      }),
    });

    // 제목과 메시지가 있는 경우에만 알림 생성
    const title = remoteMessage.notification?.title;
    const body = remoteMessage.notification?.body;

    
    if (body && (currentRoute === 'index' || currentRoute === 'more' || currentRoute === 'nearby' || currentRoute === 'meeting')) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          channelId: 'default',
          sound: 'default',  // iOS 기본 알림음 재생
          data: remoteMessage?.data, // 전달받은 데이터 추가
        },
        trigger: null, // 즉시 알림을 트리거합니다.
      });
    } else {
      console.log('알림이 생성되지 않음: 제목 또는 메시지가 없음. 또는 알림이 오는 화면이 아님');
    }
  });

  return unsubscribe;
}, []);



  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      // 기본 탭 이동 동작을 유지하려면 아래를 주석 해제
      // e.preventDefault();
      setLoading(true);
      fetchPosts(filters);     // 게시글 불러오기
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      //console.log("탭 버튼 눌림 감지");

    });

    return unsubscribe; // 컴포넌트 언마운트 시 이벤트 리스너 정리
  }, [navigation, filters]);

  useEffect(() => {
    // 알림 터치 이벤트 처리
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigation.navigate('messages'); // 해당 화면으로 이동
    });
  
    return () => subscription.remove();
  }, [navigation]);




  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts(filters);     // 게시글 불러오기
  }, [filters]);

  const handleFilterPress = (filterType) => {
    setSelectedFilter(filterType);
    fetchPosts(filterType);
  };

  const handleWritePress = () => {
    navigation.navigate('WriteScreen');
  };

  const handleMorePress = useCallback((post, event) => {
    setOptionsVisible(true);
    setSelectedPost(post);
    //console.log(post);
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
        reportedUserId: selectedPost.userId, // 
        reportContent, // 신고 작성 내용
        postId: selectedPost.id, // 신고 대상 게시물 ID
        postText: selectedPost.content,
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
        //console.log('신고가 성공적으로 접수되었습니다.');
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

  const checkFcmToken = async () => {
    const storedToken = await AsyncStorage.getItem('fcmToken'); // 저장된 기존 토큰
    const currentToken = await getToken(messagingInstance); // 현재 FCM 토큰
    const token = await EncryptedStorage.getItem('userToken');

    if (storedToken !== currentToken) {
      //console.log('FCM 토큰이 변경되었습니다.');
      //console.log('stored:', storedToken);
      //console.log('current', currentToken);
      // 갱신된 토큰 서버로 동기화
      await sendFcmTokenToServer(token, currentToken);
  
      // 새로운 토큰 AsyncStorage에 저장
      await AsyncStorage.setItem('fcmToken', currentToken);
    } else {
      //console.log('FCM 토큰이 동일합니다.');
    }
  };


  const sendFcmTokenToServer = async (token, fcmToken) => {
    try {
      const response = await fetch(`${API_URL}/api/fcm/save-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // 요청의 Content-Type을 JSON으로 설정
          Authorization: `Bearer ${token}`, // JWT 토큰 포함
        },
        body: JSON.stringify({ fcmToken }), // 본문 데이터를 JSON 문자열로 변환
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      //console.log('FCM 토큰 서버 전송 완료:', fcmToken);
    } catch (error) {
      console.error('FCM 토큰 서버 전송 실패:', error.message);
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
      alert("자신의 게시물입니다.");
      return true; // 자신의 게시물임
    }

  return false; // 자신의 게시물이 아님

  }

  const handleSendMessage = async () => {
    try {

      // 캔디 부족 여부 체크
      if (remainingCandy === null || remainingCandy === undefined || remainingCandy < 3) {
        Alert.alert("알림", "캔디가 부족합니다. 충전 후 이용해주세요.");
        return; // 캔디 부족하면 메시지 전송 막기
      }

      // 사용자 토큰 가져오기
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
  
      //console.log("수신자 ID: ", selectedRecipient.userId);
      //console.log("메시지 내용: ", messageContent);
      //console.log("발신자 토큰: ", token);
  
      const sendMessageData = {
        recipientId: selectedRecipient.userId, // 상대방 ID
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
        //("메시지 전송 성공:", responseText);
        // 전송 후 캔디 감소 (UI 반영)
        setRemainingCandy((prevCandy) => (prevCandy !== null ? prevCandy - 3 : prevCandy));

        fetchRemainingCandy();
        
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

  const loadMorePosts = async (filters, lastDistance) => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }
      console.log("추가 게시글 호출됨");
      // 가장 과거의 포스트 ID 가져오기
      const lastPostId = posts.length > 0 ? posts[posts.length - 1].id : null;
      //console.log(lastPostId);
      //console.log(filters);
      //console.log(lastDistance);
      const response = await fetch(`${API_URL}/api/posts/get-more-post?lastPostId=${lastPostId}&ageRange1=${filters.ageRange[0]}&ageRange2=${filters.ageRange[1]}&gender=${filters.gender}&sort=${filters.sort}&lastDistance=${lastDistance}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // ✅ 응답이 비어있거나 JSON이 아닌 경우 예외 처리
        const responseText = await response.text(); // JSON 대신 일반 텍스트로 먼저 받기
        if (!responseText) {
          //console.warn("서버 응답이 비어 있습니다.");
          return; // 빈 응답이므로 JSON 파싱을 하지 않고 함수 종료
        }

        let additionalPosts;
        try {
          additionalPosts = JSON.parse(responseText); // 수동 JSON 파싱
        } catch (error) {
          console.error("JSON 파싱 오류:", error);
          return; // JSON 파싱 실패 시 함수 종료
        }

        // ✅ 추가 게시글이 없거나 유효하지 않은 경우 예외 처리
        if (!additionalPosts || !Array.isArray(additionalPosts) || additionalPosts.length === 0) {
          //console.warn("추가 게시물이 없습니다.");
          return; // 빈 데이터를 받으면 여기서 함수 종료
        }
        //setPosts((prevPosts) => [...prevPosts, ...additionalPosts]);
        setPosts((prevPosts) => {
          // data에서 id가 중복되지 않은 사용자만 필터링
          const newPosts = additionalPosts.filter(newPost => !prevPosts.some(existingPost => existingPost.id === newPost.id));
          return [...prevPosts, ...newPosts];
        });

        const cal = calculateDistance(additionalPosts[additionalPosts.length-1]?.postLatitude, additionalPosts[additionalPosts.length-1]?.postLongitude);
      
        if(!isNaN(cal)){
          setLastDistance(cal);
          //console.log("다음 데이터에 요청할 현재 데이터의 마지막 거리:", cal * 0.9);
        } else if(isNaN(cal)) {
          setLastDistance(0);
        }

        //console.log(additionalPosts.post.id);
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      } else {
        console.log('추가 게시물을 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('추가 게시물 로드 중 오류 발생:', error);
    }
  };
  

  const modalStyle = useMemo(() => ({
    top: modalPosition.y - 45,
    left: modalPosition.x - 115,
  }), [modalPosition]);
  
  if (!locationLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          초기 위치정보를 로딩중입니다. 몇 초만 기다려주세요.
        </Text>
        <ActivityIndicator size="large" color={colors.main} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={async () => {
            setLocationLoaded(true)
            await AsyncStorage.setItem('initialLocationReceived', 'true');
          }}
        >
          <Text style={styles.closeButtonText}>닫기</Text>
        </TouchableOpacity>
      </View>
    );
  }
  

  return (
    <View style={styles.container}>

    {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.main} />
        </View>
      )}

    

{/* 쪽지 모달 */}
<Modal
  visible={messageModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setMessageModalVisible(false)}
>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'position' : undefined} // "position" 방식도 시도해보세요.
    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // 필요 시 오프셋 조정
  >
    {/* 모달 전체 영역(배경)은 터치 이벤트 처리하지 않음 */}
    <View style={styles.modalOverlay}>
      {/* 모달 컨텐츠 영역을 TouchableWithoutFeedback로 감싸면 내부 빈 공간 터치 시 Keyboard.dismiss() */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalContent}>
          {/* 모달 헤더 */}
          <View style={styles.modalHeader}>
            <Image
              source={require('../../assets/images/message2.png')}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>쪽지 보내기</Text>
          </View>
          
          {/* 수신자 정보 */}
          <View style={styles.recipientContainer}>
            <Text
              style={[
                styles.recipientName,
                selectedRecipient?.gender === 'male'
                  ? styles.blueTextMSG
                  : selectedRecipient?.gender === 'female'
                  ? styles.pinkTextMSG
                  : styles.grayTextMSG,
              ]}
            >
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
          
          {/* 버튼 영역 */}
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
                    Alert.alert('다시 로그인 해주세요.');
                    navigation.navigate('LoginScreen');
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
      </TouchableWithoutFeedback>
    </View>
  </KeyboardAvoidingView>
</Modal>


      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostItem
            item={item}
            calculateDistance={calculateDistance}
            handleMorePress={handleMorePress}
            fetchRemainingCandy={fetchRemainingCandy}
            setSelectedRecipient={setSelectedRecipient} // 추가
            isMe={isMe}
            setMessageModalVisible={setMessageModalVisible} // 모달 열기 함수 전달
            setSelectedImage={setSelectedImage}
            setVisible={setVisible}
            location={location}
            navigation={navigation}
            setViewerVisible={setViewerVisible}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        windowSize={30} // 화면에 보이는 영역 기준 추가로 로드할 영역
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        removeClippedSubviews={true}
        ref={flatListRef} // FlatList에 ref 연결
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
       /* ListFooterComponent={
          <TouchableOpacity style={styles.loadMoreButton} onPress={() => loadMorePosts(lastDistance)}>
            <Text style={styles.loadMoreButtonText}>더보기</Text>
          </TouchableOpacity>
        }*/
        onEndReached={() => loadMorePosts(filters, lastDistance)} // 끝부분에 도달했을 때 호출
        onEndReachedThreshold={0.2} // 80% 지점에서 호출
      />


      <FilterBar applyFilters={applyFilters} showWriteButton={true} />


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
							top: Platform.OS === 'android' ? 40 : 60, // iOS와 Android에서 상태바 높이를 고려
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
							imageUrls={[{ url: selectedImage }]} // 이미지 리스트 전달 (배열 형태로 수정)
							enableSwipeDown={true} // 스와이프 다운으로 닫기
							onSwipeDown={() => setViewerVisible(false)} // 닫기 핸들러
              renderIndicator={() => null} // 페이지 번호 제거
							
						/>
					</Modal>
      

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
                  const isMyPost = await isMe(selectedPost, token); // `await`로 결과 처리
                  if(!isMyPost){
                    setOptionsVisible(false); // 기존 옵션 모달 닫기
                    setTimeout(() => setReportModalVisible(true), 300); // UI 업데이트 보장
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
    {(dailyPostCount === 0 || dailyPostCount === 2) && (<RewardModal 
        visible={isRewardModalVisible} 
        onClose={() => setRewardModalVisible(false)} 
        navigation={navigation}
      />)}
      

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 37,
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'android' ? 60 : 60,
  },
  postContainer: {
    padding: 10,
    marginVertical: 2,
    marginLeft: 3,
    //marginBottom: Platform.OS === 'android' ? 30 : 50,
    //backgroundColor: '#FFFFFF',
    //borderRadius: 8,
    //shadowColor: '#000',
   // shadowOffset: { width: 0, height: 2 },
    //shadowOpacity: 0.1,
    //shadowRadius: 4,
    //elevation: 2,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    fontSize: width * 0.036,
    marginBottom: 2,
    marginTop: 10,
    lineHeight: Platform.OS === 'android' ? 23.5 : 20,
    
  },
  grayText: {
    fontSize: width * 0.028,
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
    color: '#949494',
    marginTop: -1,
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
    fontSize: width * 0.045,
    color: colors.main, // 
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  nicknameText: {
    fontSize: width * 0.033,
    fontWeight: '400',
    //marginHorizontal: width * 0.01,
    color: '#000',
    marginRight: width * 0.01,
    //lineHeight: 1,
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
    
  },
  ageText: {
    fontSize: width * 0.029,
    marginRight: width * 0.01,
    marginTop: 1,
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  pinkText: {
    color: '#FF69B4',
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  pinkTextMSG: {
    color: '#FF69B4',
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  blueText: {
    color: '#007BFF',
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  blueTextMSG: {
    color: '#007BFF',
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  moreButton: {
    marginRight: 0,
    //padding: 10,
    paddingLeft:1,
    paddingTop:15,
    paddingBottom:15,
    marginRight: 4,
  },
  moreButtonImage: {
    width: 14,
    height: 14,
  },
  postImage: {
    width: width * 0.1,
    height: width * 0.1,
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
    //paddingVertical: height * 0.0085,
    height: height * 0.035,
    // borderBottomWidth: 0, // 기존 보더 관련 속성 제거
    position: 'relative', // 절대 위치를 위한 부모의 상대 위치 설정
    //backgroundColor: '#fff', // 필요에 따라 배경색 설정
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
  buttonText2: {
    color: '#FFFFFF',
    fontSize: height * 0.018,
    fontWeight: 'bold',
    
  },
  selectedButtonText: {
    color: colors.main,
  },
  writeButton: {
    backgroundColor: colors.main,
    borderRadius: 5,
    marginHorizontal: 0,
    paddingHorizontal: width * 0.025,
    
  },
  separator: {
    height: StyleSheet.hairlineWidth,
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
  messageButton: {
    marginLeft: 0,
    width: width * 0.115,
    height: width * 0.115,
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
    width: Platform.OS === 'android' ? 25 : 25,
    height: Platform.OS === 'android' ? 28 : 28,
    resizeMode: 'stretch',
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
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginTop: -3,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameAndAge: {
    flexDirection: 'row',
    marginBottom: Platform.OS === 'android' ? -5 : 3, // 아래 요소와의 간격 최소화
  },
  locationAndTime: {
    flexDirection: 'row',
  },
  ImageViewer: {
    width: width * 0.4,
    height: width * 0.4,
    //backgroundColor: '#000',
  },
  contentImage: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: 10,
    //marginRight: 0,
    //marginVertical: 5,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333333',
    fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: colors.main,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
