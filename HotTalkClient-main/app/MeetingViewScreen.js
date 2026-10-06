import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Alert, 
  Dimensions,
  Modal ,
  Keyboard,
  TouchableWithoutFeedback,
  errorText
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'; // 내비게이션 사용을 위해 추가
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import locations from '../assets/locations.json';
import colors from './styles/colors'; // 없으면 기본값 사용
import DateTimePicker from '@react-native-community/datetimepicker';
import EncryptedStorage from 'react-native-encrypted-storage';
const { width } = Dimensions.get('window');
import { format } from 'date-fns';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, getToken, subscribeToTopic, unsubscribeFromTopic } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import ImageViewer from 'react-native-image-zoom-viewer';



export default function MeetingViewScreen() {
  const [activeTab, setActiveTab] = useState('home');
  //const API_URL = Constants.expoConfig.extra.API_URL // API 엔드포인트
  const API_URL = Constants.expoConfig.extra.API_URL;
  //const API_URL = "http://192.168.0.2:5000";
  const [meetingId, setMeetingId] = useState(null);
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState(null);
  const navigation = useNavigation();
  const [meetingInfo, setMeetingInfo] = useState(null);
  
  // 모달 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [periodicTitle, setPeriodicTitle] = useState('');
  const [periodicDescription, setPeriodicDescription] = useState('');
  const [periodicDay, setPeriodicDay] = useState('');
  const [mainImageModalVisible, setMainImageModalVisible] = useState(false);
  const [periodicTime, setPeriodicTime] = useState('');
  const [periodicLocation, setPeriodicLocation] = useState('');
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  // Organizer 전용: 모임 정보 수정 모달 상태 및 수정 필드들
  const [editMeetingModalVisible, setEditMeetingModalVisible] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [periodicCost, setPeriodicCost] = useState('');
  // 모달 노출 여부
const [kickModalVisible, setKickModalVisible] = useState(false);

// 모달에서 어떤 멤버를 다룰지 저장
const [selectedMember, setSelectedMember] = useState(null);

  // 상단에 state 추가
const [extendModalVisible, setExtendModalVisible] = useState(false);
const [extendOptionModalVisible, setExtendOptionModalVisible] = useState(false);
const [remainingDays, setRemainingDays] = useState(null);
  const [periodicMax, setPeriodicMax] = useState(''); // 정기모임 최대 인원
  // 날짜 선택 관련 상태
  const [galleryData, setGalleryData] = useState([]);
  const [periodicDate, setPeriodicDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [periodicMeetings, setPeriodicMeetings] = useState([]);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const app = getApp(); // 기본 Firebase 앱 인스턴스
  const messagingInstance = getMessaging(app);
  const [currentUserExternalUserId, setCurrentUserExternalUserId] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [location, setLocation] = useState(null);
    const [filteredLocations, setFilteredLocations] = useState([]);
// Board 탭 내 상태 추가 (예: renderBoard 함수 상단 또는 컴포넌트 상단)
  const [boardModalVisible, setBoardModalVisible] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardContent, setBoardContent] = useState('');
  // 1. boardData 상태 추가 (컴포넌트 상단)
  const [boardData, setBoardData] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editedMaxParticipants, setEditedMaxParticipants] = useState(
    meetingInfo?.maxParticipants || 30
  );
const [imageModalVisible, setImageModalVisible] = useState(false);
const [candyCount, setCandyCount] = useState(0); // 임시값
  useEffect(() => {
    if (route.params?.meetingId) {
      setMeetingId(route.params.meetingId);
      //console.log(route.params.meetingId);
    }
  }, [route.params?.meetingId]);


  // meetingInfo와 isOrganizer가 업데이트될 때 잔여일 계산 후 모달 노출
  useEffect(() => {
    if (isOrganizer && meetingInfo && meetingInfo.remainingDays !== undefined) {
      setRemainingDays(meetingInfo.remainingDays);
      setExtendModalVisible(true);
    }
  }, [isOrganizer, meetingInfo]);
  
  useEffect(() => {
    // meetingInfo가 업데이트되면 수정 필드에 초기값 설정
    if (meetingInfo) {
      setEditedTitle(meetingInfo.title);
      setEditedLocation(meetingInfo.location);
      setEditedDescription(meetingInfo.description);
    }
    if (meetingInfo && meetingInfo.maxParticipants) {
      setEditedMaxParticipants(Number(meetingInfo.maxParticipants));
    }
  }, [meetingInfo]);

  // Organizer 여부 결정 (예시)
  useEffect(() => {
    // 토큰에서 externalUserId 추출 후 meetingInfo와 비교
    EncryptedStorage.getItem('userToken')
      .then(token => {
        if (token && meetingInfo) {
          const decodedToken = decodeJWT(token);
          if (decodedToken && decodedToken.sub) {
            setIsOrganizer(meetingInfo.externalUserId === decodedToken.sub);
          }
        }
      })
      .catch(error => console.error("Error decoding token:", error));
  }, [meetingInfo]);

  // 🔹 위치 검색 기능
    const handleSearchLocation = (text) => {
      setSearchQuery(text);
      if (text.trim() === '') {
        setFilteredLocations([]);
        return;
      }
  
      const results = locations
        .filter((item) => item.읍면동명.includes(text) || item.시군구명.includes(text))
        .slice(0, 10)
        .map((item) => ({
          key: `${item.시군구명} ${item.읍면동명}`,
          시군구명: item.시군구명,
          읍면동명: item.읍면동명
        }));
  
      setFilteredLocations(results);
    };
  
    // 🔹 위치 선택 (1개만 가능)
    const selectLocation = (selected) => {
      setLocation(`${selected.시군구명} ${selected.읍면동명}`);
      setLocationModalVisible(false);
    };
  
    // 🔹 등록 버튼 클릭 -> 구독 안내 모달 표시
    const handleSubmit = () => {
      if (!title || !description || !topic || !location || !selectedImage) {
        alert('모든 필드를 입력하세요.');
        return;
      }
  
      setModalVisible(true);
    };

  // 업데이트 API 호출 (서버와 연동)
  const handleUpdateMeeting = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      const response = await fetch(`${API_URL}/api/meeting/update-meeting-info?meetingId=${meetingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editedTitle,
          location: editedLocation,
          description: editedDescription,
          maxParticipants: editedMaxParticipants,  // 새로 추가
        }),
      });
      if (response.ok) {
        // 업데이트 성공 시 meetingInfo 갱신
        Alert.alert("업데이트 성공", "모임 정보가 업데이트되었습니다.");
        setMeetingInfo({
          ...meetingInfo,
          title: editedTitle,
          location: editedLocation,
          description: editedDescription,
        });
        setEditMeetingModalVisible(false);
      } else {
        const errorText = await response.text();
        Alert.alert("업데이트 실패", errorText);
      }
    } catch (error) {
      console.error("업데이트 오류:", error);
      Alert.alert("업데이트 오류", error.message);
    }
  };

  const handleExtend = async (months) => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      const response = await fetch(
        `${API_URL}/api/meeting/extendMeeting?meetingId=${meetingId}&months=${months}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
  
      if (response.ok) {
        const result = await response.text();
        Alert.alert("연장 완료", result);
        // 연장 후 최신 미팅 정보 갱신
        fetchMeetingInfo(meetingId);
        setExtensionModalVisible(false);
        setExtendModalVisible(false);
      } else {
        // 서버가 500번대 오류 등으로 캔디 부족 메시지를 보낸 경우
        const errorText = await response.text();
        Alert.alert("연장 실패", errorText);
      }
    } catch (error) {
      console.error("연장 호출 중 오류:", error);
      Alert.alert("연장 오류", error.message);
    }
  };
  
  



  const formatDate = (timestamp) => format(new Date(timestamp), 'yyyy-MM-dd HH:mm', { locale: ko });
// meetingId가 업데이트된 후 fetchMembers 호출
useEffect(() => {
  if (meetingId) {
    fetchMembers(meetingId);
    fetchPeriodicMeetings();
    fetchMeetingInfo(meetingId);
  }
}, [meetingId]);

const fetchPeriodicMeetings = async () => {
  try {
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen");
      return;
    }
    if (!meetingId) {
      Alert.alert("모임 ID가 유효하지 않습니다.");
      return;
    }
    const response = await fetch(
      `${API_URL}/api/meeting/fetch-periodic?meetingId=${meetingId}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    if (response.ok) {
      const data = await response.json();
      //console.log("Periodic Meetings:", data);
      setPeriodicMeetings(data);
    } else if (response.status === 401) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen");
    } else {
      console.error('정기모임을 가져오는 데 실패했습니다.');
    }
  } catch (error) {
    console.error('정기모임을 가져오는 중 오류 발생:', error);
  }
};


const fetchGalleryImages = async () => {
  try {
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen");
      return;
    }
    if (!meetingId) {
      Alert.alert("모임 ID가 유효하지 않습니다.");
      return;
    }
    const response = await fetch(`${API_URL}/api/gallery/getImages?meetingId=${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      //console.log(data);
      // data는 [{ id, imageUrl }, ...] 형식의 배열이라고 가정
      setGalleryData(data);
    } else {
      console.error("갤러리 이미지 불러오기 실패", response.status);
    }
  } catch (error) {
    console.error("갤러리 이미지 불러오는 중 오류 발생:", error);
  }
};




const addGalleryPhoto = async () => {
  // 권한 요청
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.");
    return;
  }
  
  // 이미지 선택
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  
  if (!result.canceled) {
    const selectedUri = result.assets[0].uri;
    Alert.alert(
      "사진 추가",
      "사진을 추가하시겠습니까? 모임 대표만 삭제 가능합니다.",
      [
        {
          text: "취소",
          style: "cancel",
          onPress: () => {} // 취소 시 아무 작업도 하지 않음.
        },
        {
          text: "확인",
          onPress: async () => {
            // FormData 객체에 이미지 파일 추가
            const formData = new FormData();
            // 파일명은 URI에서 추출 (실제 확장자나 mime-type은 필요에 따라 결정)
            const fileName = selectedUri.split('/').pop();
            const fileType = "image/jpeg"; // 상황에 따라 'image/png' 등으로 변경
            formData.append("image", {
              uri: selectedUri,
              name: fileName,
              type: fileType,
            });
            
            const token = await EncryptedStorage.getItem('userToken');
            if (!token) {
              return;
            }
            
            let attempts = 0;
            let success = false;
            let data = null;
            while (attempts < 5 && !success) {
              try {
                const response = await fetch(`${API_URL}/api/gallery/upload?meetingId=${meetingId}`, {
                  method: "POST",
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    // Content-Type 생략 (fetch가 multipart/form-data의 boundary 자동 설정)
                  },
                  body: formData,
                });
                
                if (response.ok) {
                  data = await response.json();
                  success = true;
                  Alert.alert("업로드 성공", "사진이 서버에 업로드되었습니다.");
                  // 서버에서 반환된 이미지 정보로 로컬 갤러리 상태 업데이트 대신,
                  // 갤러리 이미지를 다시 불러오는 함수를 실행합니다.
                  fetchGalleryImages();
                } else {
                  const errorText = await response.text();
                  console.log(`시도 ${attempts + 1}: ${errorText}`);
                  attempts++;
                }
              } catch (error) {
                console.log(`시도 ${attempts + 1} 오류:`, error.message);
                attempts++;
              }
            }
            
            if (!success) {
              Alert.alert("업로드 실패", "이미지 업로드에 5회 재시도하였으나 실패하였습니다. 나중에 다시 시도해주세요.");
            }
          }
        }
      ]
    );
  }
};




// EncryptedStorage에서 JWT 토큰을 꺼내어 디코딩하고 externalUserId를 저장
useEffect(() => {
  EncryptedStorage.getItem('userToken')
    .then(token => {
      if (token) {
        const decodedToken = decodeJWT(token);
            if (!decodedToken || !decodedToken.sub) {
              console.error('JWT에서 externalUserId를 추출할 수 없습니다.');
              return;
            }
            const myExternalUserId = decodedToken.sub;


        setCurrentUserExternalUserId(myExternalUserId);
      }
    })
    .catch(error => console.error("Error decoding token:", error));
}, []);

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

// meetingInfo와 currentUserExternalUserId가 모두 준비되면 대표 여부 설정
useEffect(() => {
  if (meetingInfo && currentUserExternalUserId) {
    setIsOrganizer(meetingInfo.externalUserId === currentUserExternalUserId);
    //console.log(isOrganizer);
  }
}, [meetingInfo, currentUserExternalUserId, isOrganizer]);

const fetchMeetingInfo = async (meetingId) => {
  try {
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen");
      return;
    }
    if (!meetingId) {
      Alert.alert("모임 ID가 유효하지 않습니다.");
      return;
    }
    const response = await fetch(
      `${API_URL}/api/meeting/get-meeting-info?meetingId=${meetingId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      //console.log("Meeting Info:", data);
      setMeetingInfo(data);
    } else if (response.status === 401) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen");
      return;
    } else {
      console.error('모임 정보를 가져오는 데 실패했습니다.');
    }
  } catch (error) {
    console.error('모임 정보를 가져오는 중 오류 발생:', error);
  }
};
 // 예시 데이터 (채팅)
 const chatData = [
  { id: '1', sender: '홍길동', message: '안녕하세요!' },
  { id: '2', sender: '김철수', message: '반갑습니다.' },
];

// 2. 게시글 불러오기 함수 작성
const fetchBoardPosts = async () => {
  try {
    const token = await EncryptedStorage.getItem('userToken');
    if (!token) {
      Alert.alert("다시 로그인 해주세요.");
      navigation.navigate("LoginScreen");
      return;
    }
    if (!meetingId) {
      Alert.alert("모임 ID가 유효하지 않습니다.");
      return;
    }
    const response = await fetch(`${API_URL}/api/board/getBoard?meetingId=${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      setBoardData(data);
      //console.log(data);
    } else {
      const errorText = await response.text();
      Alert.alert("게시글 불러오기 실패", errorText);
    }
  } catch (error) {
    console.error("게시글 불러오기 오류:", error);
    Alert.alert("오류", "게시글 불러오는 중 오류가 발생했습니다.");
  }
};

// 3. activeTab이 'board'일 때마다 불러오기 (meetingId가 있을 때)
useEffect(() => {
  if (activeTab === 'gallery' && meetingId) {
    fetchGalleryImages();
  }
  if (activeTab === 'board' && meetingId) {
    fetchBoardPosts();
  }
}, [activeTab, meetingId]);

const fetchRemainingCandy = async () => {
    try {
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
        setCandyCount(data.candy);
        //console.log("남은 캔디", data.candy)
        return data.candy;
      } else if(response.status === 401){
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
        return;
      }  else {
        const errorData = await response.json();
        Alert.alert('실패', errorData.message || '잔여 캔디를 불러오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('잔여 캔디 불러오기 오류:', error);
      Alert.alert('오류', '잔여 캔디를 불러오는 중 오류가 발생했습니다.');
    } finally {

    }
  };

  const fetchMembers = async (meetingId) => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      // meetingId 값이 유효한지 확인 후 호출
      if (!meetingId) {
        Alert.alert("모임 ID가 유효하지 않습니다.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/meeting/fetch-members?meetingId=${meetingId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

  
      if (response.ok) {
          const data = await response.json();
          // data 처리
          //console.log("멤버목록", data);
          setMembers(data);
        } else if (response.status === 404) {
          // 멤버가 없을 경우 빈 배열로 처리
          setMembers([]);
        }
       else if (response.status === 401) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      } else {
        console.error('멤버를 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('멤버를 가져오는 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };

    // 토픽 가입 함수
    const subscribeToUserTopics = async (meetingId, userId) => {
      try {
        if (!meetingId) {
          console.log('❗ meetingId 없음, 토픽 가입 스킵');
          return;
        }

        const topic = `meeting_${meetingId}`;

        // 1) meetingTopics 배열에 항상 기록
        const stored = await AsyncStorage.getItem('meetingTopics');
        let topics = stored ? JSON.parse(stored) : [];

        if (!topics.includes(topic)) {
          topics.push(topic);
          await AsyncStorage.setItem('meetingTopics', JSON.stringify(topics));
          console.log('📝 meetingTopics 저장/업데이트:', topics);
        }

        // 2) 전체 푸시 ON 여부 확인
        const savedSetting = await AsyncStorage.getItem('pushNotification');
        // SettingsScreen 에서 기본값을 true 로 쓰고 있으니
        // null 이면 true 로 취급 (앱 처음 설치 후 기본 ON 상태)
        const isPushOn = savedSetting === null || savedSetting === 'true';

        if (!isPushOn) {
          console.log('🔕 전체 푸시 OFF 상태라 토픽만 기록하고 구독은 안 함:', topic);
          return;
        }

        // 3) 전체 푸시 ON 이면 FCM 토픽 구독
        await subscribeToTopic(messagingInstance, topic);
        console.log(`✅ 그룹 푸시 구독: ${topic}`);
      } catch (error) {
        console.error('토픽 가입 중 오류:', error.message || error);
      }
    };

    //console.log(meetingId);
    // 게시글 등록 함수


    const handleKickMember = async (member) => {
      try {
        setKickModalVisible(false);
        
        // 서버에 추방 API 호출 (예: /api/meeting/kickMember)
        // 외부 사용자 ID가 member.externalUserId
        const token = await EncryptedStorage.getItem('userToken');
        if (!token) {
          Alert.alert("다시 로그인 해주세요.");
          navigation.navigate("LoginScreen");
          return;
        }
    
        const response = await fetch(
          `${API_URL}/api/meeting/kickMember?meetingId=${meetingId}&externalUserId=${member.externalUserId}`, 
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          }
        );
    
        if (response.ok) {
          Alert.alert("추방 완료", `${member.nickname}을(를) 추방했습니다.`);
          // 멤버 목록 다시 가져오기
          fetchMembers(meetingId);
        } else {
          const errorText = await response.text();
          Alert.alert("추방 실패", errorText);
        }
      } catch (error) {
        console.error("추방 오류:", error);
        Alert.alert("추방 오류", error.message);
      }
    };

    

    const handleBoardRegister = async () => {
      try {
        const token = await EncryptedStorage.getItem('userToken');
        if (!token) {
          Alert.alert("다시 로그인 해주세요.");
          navigation.navigate("LoginScreen");
          return;
        }
        // meetingId는 이미 상태에 저장되어 있다고 가정합니다.
        const response = await fetch(`${API_URL}/api/board/createBoard?meetingId=${meetingId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: boardTitle,
            content: boardContent,
          }),
        });
        if (response.ok) {
          const resultText = await response.text();
          Alert.alert("등록 완료", resultText || "게시글이 등록되었습니다.");
          setBoardTitle('');
          setBoardContent('');
          setBoardModalVisible(false);
          fetchBoardPosts();
        } else {
          const errorText = await response.text();
          Alert.alert("등록 실패", errorText);
        }
      } catch (error) {
        console.error("게시글 등록 오류:", error);
        Alert.alert("오류", "게시글 등록 중 오류가 발생했습니다.");
      }
    };
    

  const handleJoin = async () => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      // fetchRemainingCandy()의 반환값을 localCandy에 담아서 검사
      const localCandy = await fetchRemainingCandy();
      if (localCandy === null) {
        Alert.alert("캔디 조회 오류", "캔디를 불러올 수 없습니다.");
        return;
      }

      if (localCandy < 3) {
        Alert.alert("캔디가 부족합니다");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/meeting/join-meeting?meetingId=${meetingId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
  
      if (response.ok) {
        // 응답이 JSON 형식인지 확인합니다.
        console.log(meetingInfo);
        subscribeToUserTopics(meetingId, meetingInfo.myUserId);
        handleSendMessage(meetingInfo.nickname, meetingId)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          //console.log(data);
          // data 처리
        } else {
          // JSON이 아닌 경우 text로 처리
          const text = await response.text();




          Alert.alert("모임에 가입 되었습니다. 채팅방은 쪽지 탭에서 확인하세요.");
        }
      } else if (response.status === 401) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      } else if (response.status === 400) {
        const errorMessage = await response.text();
        Alert.alert(errorMessage);
        return;
      } else {
        console.error('미팅을 가져오는 데 실패했습니다.');
      }
    } catch (error) {
      console.error('미팅을 가져오는 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (nickname, meetingId) => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      //console.log(meetingId);
      const sendMessageData = {
        recipientId: meetingId, // ID
        messageContent: nickname + "가 가입했습니다.",
        isMeeting: true,
        meetingId,
      };
  
      const response = await fetch(`${API_URL}/api/userChatRooms/first-send-message-meeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sendMessageData),
      });
  
      // 서버 응답 상태 확인
      if (!response.ok) {
        const errorData = await response.text();
        Alert.alert("오류", errorData);
        return; // 오류일 경우 이후 실행 중단
      }
  
      const responseText = await response.text();
      console.log("메시지 전송 성공:", responseText);
      Alert.alert("전송완료", "쪽지가 전송 되었습니다.");
  

  
    } catch (error) {
      console.error('메시지 전송 중 오류 발생:', error);
    }
  };
  


  const handleRegisterPeriodic = async () => {
    try {
      if (!periodicTitle || !periodicDescription || !periodicTime || !periodicLocation || !periodicCost || !periodicMax) {
        Alert.alert('모든 필드를 입력하세요.');
        return;
      }
      const token = await EncryptedStorage.getItem('userToken');
      if (!token) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      if (!meetingId) {
        Alert.alert("모임 ID가 유효하지 않습니다.");
        return;
      }
      const requestBody = {
        title: periodicTitle,
        description: periodicDescription,
        date: periodicDate.toISOString().split('T')[0], // "YYYY-MM-DD" 형식
        time: periodicTime,
        location: periodicLocation,
        cost: parseInt(periodicCost, 10),
        maxParticipants: parseInt(periodicMax, 10) // DTO에 정의한 이름과 일치시킵니다.
      };
      const response = await fetch(
        `${API_URL}/api/meeting/register-periodic?meetingId=${meetingId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        }
      );
      if (response.ok) {
        const data = await response.text();
        Alert.alert("정기모임 등록", data);
        fetchPeriodicMeetings();
        setModalVisible(false);
      } else if (response.status === 400) {
        const errorMessage = await response.text();
        Alert.alert("정기모임 등록 실패", errorMessage);
      } else if (response.status === 401) {
        Alert.alert("다시 로그인 해주세요.");
        navigation.navigate("LoginScreen");
      } else {
        Alert.alert("정기모임 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error('정기모임 등록 중 오류 발생:', error);
    }
  };
  
  

  const handleDeleteBoardPost = async (postId) => {
    try {
      Alert.alert(
        "게시글 삭제",
        "정말로 게시글을 삭제하시겠습니까?",
        [
          {
            text: "취소",
            style: "cancel",
          },
          {
            text: "삭제",
            onPress: async () => {
              const token = await EncryptedStorage.getItem('userToken');
              if (!token) {
                Alert.alert("다시 로그인 해주세요.");
                navigation.navigate("LoginScreen");
                return;
              }
              // DELETE API 호출 (엔드포인트 URL은 실제 서버 구현에 맞게 조정하세요)
              const response = await fetch(`${API_URL}/api/board/deleteBoard?postId=${postId}&meetingId=${meetingId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.ok) {
                Alert.alert("삭제 완료", "게시글이 삭제되었습니다.");
                fetchBoardPosts(); // 게시글 목록 다시 불러오기
              } else {
                const errorText = await response.text();
                Alert.alert("삭제 실패", errorText);
              }
            },
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      Alert.alert("삭제 오류", error.message);
    }
  };

  const handleChangeMeetingImage = async () => {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("권한 필요", "사진 접근 권한이 필요합니다.");
      return;
    }
    
    // 이미지 선택
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      try {
        const token = await EncryptedStorage.getItem('userToken');
        if (!token) {
          Alert.alert("다시 로그인 해주세요.");
          navigation.navigate("LoginScreen");
          return;
        }
        
        // FormData 객체에 이미지 파일 추가
        const formData = new FormData();
        const fileName = selectedUri.split('/').pop();
        const fileType = "image/jpeg"; // 상황에 따라 조정
        formData.append("image", {
          uri: selectedUri,
          name: fileName,
          type: fileType,
        });
        
        // API 호출: meetingId에 해당하는 모임 이미지 업데이트
        const response = await fetch(`${API_URL}/api/meeting/update-meeting-image?meetingId=${meetingId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // 'Content-Type'는 생략해서 multipart/form-data boundary 자동 설정
          },
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          // 서버에서 반환하는 새로운 이미지 URL로 meetingInfo 업데이트
          setMeetingInfo({ ...meetingInfo, imageUrl: data.imageUrl });
          Alert.alert("업데이트 성공", "모임 이미지가 변경되었습니다.");
        } else {
          const errorText = await response.text();
          Alert.alert("업데이트 실패", errorText);
        }
      } catch (error) {
        Alert.alert("오류", error.message);
      }
    }
  };
  


  const handleDeleteImage = async (imageId, imageUrl) => {
    try {
      // 삭제 전 확인 Alert
      Alert.alert(
        "이미지 삭제",
        "정말로 이미지를 삭제하시겠습니까?",
        [
          {
            text: "취소",
            style: "cancel",
          },
          {
            text: "삭제",
            onPress: async () => {
              const token = await EncryptedStorage.getItem('userToken');
              if (!token) {
                Alert.alert("다시 로그인 해주세요.");
                navigation.navigate("LoginScreen");
                return;
              }
              console.log(imageId);
              // DELETE API 호출: API_URL과 엔드포인트는 실제 서버 구현에 맞게 조정하세요.
              const response = await fetch(`${API_URL}/api/gallery/deleteImage?imageId=${imageId}&meetingId=${meetingId}&imageUrl=${imageUrl}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.ok) {
                Alert.alert("삭제 완료", "이미지가 삭제되었습니다.");
                // galleryData 상태에서 삭제한 이미지 제거
                setGalleryData(prev => prev.filter(img => img.id !== imageId));
                setImageModalVisible(false);
              } else {
                const errorText = await response.text();
                Alert.alert("삭제 실패", errorText);
              }
            },
            style: "destructive",
          }
        ]
      );
    } catch (error) {
      Alert.alert("삭제 오류", error.message);
    }
  };
  
  const handleDeletePeriodic = async (periodicId) => {
    try {
      Alert.alert(
        "정기모임 삭제",
        "정말로 정기모임을 삭제하시겠습니까?",
        [
          {
            text: "취소",
            style: "cancel",
          },
          {
            text: "삭제",
            onPress: async () => {
              const token = await EncryptedStorage.getItem('userToken');
              if (!token) {
                Alert.alert("다시 로그인 해주세요.");
                navigation.navigate("LoginScreen");
                return;
              }
              const response = await fetch(`${API_URL}/api/meeting/deletePeriodic?periodicId=${periodicId}&meetingId=${meetingId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.ok) {
                Alert.alert("삭제 완료", "정기모임이 삭제되었습니다.");
                setPeriodicMeetings(prev => prev.filter(item => item.id !== periodicId));
              } else {
                const errorText = await response.text();
                Alert.alert("삭제 실패", errorText);
              }
            },
            style: "destructive",
          },
        ]
      );
    } catch (error) {
      Alert.alert("삭제 오류", error.message);
    }
  };
  

// 수정 후 (예시)
const renderTabBar = () => (
  <View style={styles.tabBar}>
    <TouchableOpacity style={[styles.tabButton, activeTab === 'home' && styles.activeTab]} onPress={() => setActiveTab('home')}>
      <Text style={styles.tabText}>홈</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.tabButton, activeTab === 'board' && styles.activeTab]} onPress={() => setActiveTab('board')}>
      <Text style={styles.tabText}>게시판</Text>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.tabButton, activeTab === 'gallery' && styles.activeTab]} onPress={() => setActiveTab('gallery')}>
      <Text style={styles.tabText}>갤러리</Text>
    </TouchableOpacity>
  </View>
);


  // 홈 화면 렌더링
  const renderHome = () => (
    <View style={styles.contentContainer}>
      {meetingInfo ? (
        <>
          {/* 제목 행에 Organizer이면 톱니바퀴 아이콘 표시 */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{meetingInfo.title}</Text>
            {isOrganizer && (
              <TouchableOpacity onPress={() => setEditMeetingModalVisible(true)}>
                <Ionicons name="settings" size={20} style={{ color: 'gray', marginLeft: 8, marginTop: -3}} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.location}>{meetingInfo.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.description}>{meetingInfo.description}</Text>
          </View>
          <Text style={styles.date}>
            {formatDistanceToNow(new Date(meetingInfo.createdAt), { addSuffix: true, locale: ko })} 개설
          </Text>
        </>
      ) : (
        <Text>모임 정보를 불러오는 중...</Text>
      )}
      <TouchableOpacity style={styles.joinButton} onPress={() =>{
         Alert.alert(
          "알림",
          "캔디 3개가 가입에 사용됩니다. 진행하시겠습니까?",
          [
            {
              text: "취소",
              onPress: () => console.log("취소됨"),
              style: "cancel",
            },
            {
              text: "확인",
              onPress: () => handleJoin(),
            },
          ],
          { cancelable: false }
        );
      }}>
        <Text style={styles.joinButtonText}>참가하기</Text>
      </TouchableOpacity>

{/* 정기모임 등록 섹션 */}
<View style={styles.recurringContainer}>
<Text style={styles.recurringTitle}>정기모임</Text>
  {/* 정기모임 목록 렌더링 */}
  {periodicMeetings && periodicMeetings.length > 0 ? (
      <View style={styles.periodicListContainer}>
      {periodicMeetings && periodicMeetings.length > 0 ? (
        periodicMeetings.map(item => (
          <View key={item.id} style={styles.periodicItem}>
            <Text style={styles.periodicItemTitle}>{item.title}</Text>
            <Text style={styles.periodicItemDate}>
              {format(new Date(item.date), 'MM월 dd일')} {item.time}
            </Text>
            <Text style={styles.periodicItemLocation}>{item.location}</Text>
            <Text style={styles.periodicItemCost}>비용: {item.cost}</Text>
            <Text style={styles.periodicItemMax}>최대 인원: {item.maxParticipants}</Text>
            {isOrganizer && (
              <TouchableOpacity 
                style={styles.periodicDeleteButton}
                onPress={() => handleDeletePeriodic(item.id)}>
                <Text style={styles.periodicDeleteButtonText}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      ) : (
        <Text>등록된 정기모임이 없습니다.</Text>
      )}
    </View>
    
    
  
  ) : (
    <Text>등록된 정기모임이 없습니다.</Text>
  )}


{isOrganizer ? (
          <TouchableOpacity style={styles.registerButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.registerButtonText}>정기모임 등록</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ marginTop: 10, color: '#777' }}>모임 대표만 정기모임을 등록할 수 있습니다.</Text>
        )}
</View>



    {/* 멤버 목록 섹션 (실제 서버 데이터 사용) */}
    <View style={styles.memberSection}>
  <Text style={styles.memberCount}>총 {members ? members.length : 0}명 참여중</Text>
  <View style={styles.memberGrid}>
    {members && members.map(item => {
      const localImages = {
        male: require('../assets/images/men.png'),
        female: require('../assets/images/women.png'),
      };
      const isDefaultProfileImage =
        item.profileImageUrl && item.profileImageUrl.includes('../assets');

      return (
        <TouchableOpacity
          key={item.id}
          style={styles.memberItem}
          onPress={() => {
            if (isOrganizer) {
              // 모임장이라면 모달을 띄워서 "추방하기 / 프로필 보기" 선택
              setSelectedMember(item);
              setKickModalVisible(true);
            } else {
              // 일반 멤버라면 바로 프로필 화면으로 이동
              navigation.navigate('ProfileViewScreen', {
                externalUserId: item.externalUserId,
              });
            }
          }}
        >
          <Image
            source={
              isDefaultProfileImage
                ? item.profileImageUrl === '../assets/images/men.png'
                  ? localImages.male
                  : localImages.female
                : { uri: item.profileImageUrl }
            }
            style={styles.memberImage}
          />
          <Text style={styles.memberNickname}>{item.nickname}</Text>
          <Text style={styles.memberAge}>{item.age}세</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>






    </View>
  );
  

  const renderBoard = () => (
  <View style={styles.tabContentContainer}>
    <View style={styles.tabContent}>
      <FlatList
        data={boardData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const localImages = {
            male: require('../assets/images/men.png'),
            female: require('../assets/images/women.png'),
          };
          const isDefaultProfileImage =
            item.profileImageUrl &&
            item.profileImageUrl.includes('../assets');
          return (
            <View style={styles.boardItem}>
              {/* 프로필 영역 */}
              <View style={styles.boardHeader}>
                <View style={styles.headerLeft}>
                  <Image
                    source={
                      isDefaultProfileImage
                        ? item.profileImageUrl === '../assets/images/men.png'
                          ? localImages.male
                          : localImages.female
                        : { uri: item.profileImageUrl }
                    }
                    style={styles.boardProfileImage}
                  />
                  <Text style={styles.boardNickname}>{item.nickname}</Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={styles.boardTime}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>
              {/* 제목과 내용 */}
              <Text style={styles.boardTitle}>{item.title}</Text>
              <Text style={styles.boardContent}>{item.content}</Text>
              {/* 모임 대표인 경우 삭제 버튼 노출 */}
              {isOrganizer && (
                <TouchableOpacity 
                  style={styles.boardDeleteButton}
                  onPress={() => handleDeleteBoardPost(item.id)}
                >
                  <Text style={styles.boardDeleteButtonText}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
    {/* 우측 하단 고정 등록 버튼 */}
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={() => {
        if (!members?.some(member => member.externalUserId === currentUserExternalUserId)) {
          Alert.alert("권한 없음", "멤버가 아니므로 게시글 등록이 불가합니다.");
          return;
        }
        setBoardModalVisible(true);
      }}
    >
      <Text style={styles.floatingButtonText}>등록</Text>
    </TouchableOpacity>
  </View>
);

  
  
  


  
  const renderGallery = () => {
    // galleryData를 복사해서 패딩 처리 (빈 아이템은 empty:true)
    const paddedGalleryData = [...galleryData];
    while (paddedGalleryData.length % 3 !== 0) {
      paddedGalleryData.push({ id: `empty-${paddedGalleryData.length}`, empty: true });
    }
  
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabTitle}>갤러리</Text>
        <FlatList
          key="galleryFlatList"
          data={paddedGalleryData}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => {
            if (item.empty) {
              return (
                <View style={[styles.galleryImageContainer, { backgroundColor: 'transparent', borderRadius: 10 }]} />
              );
            }
            return (
              <TouchableOpacity onPress={() => {
                setSelectedImage(item);
                setImageModalVisible(true);
              }}>
                <View style={styles.galleryImageContainer}>
                  <Image 
                    source={{ uri: item.imageUrl }} 
                    style={[styles.galleryImage, { borderRadius: 10 }]} 
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ alignItems: 'center' }}
        />
        {/* 우측 하단에 사진 추가 버튼 */}
        <TouchableOpacity 
          style={styles.floatingButton} 
          onPress={async () => {
            if (!members?.some(member => member.externalUserId === currentUserExternalUserId)) {
              Alert.alert("권한 없음", "멤버가 아니므로 갤러리 사진 등록이 불가합니다.");
              return;
            }
            // 멤버인 경우, 기존 addGalleryPhoto 함수를 실행합니다.
            await addGalleryPhoto();
          }}
        >
          <Text style={styles.floatingButtonText}>사진 추가</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  
  
  

  // 채팅 탭 렌더링
  const renderChat = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>채팅</Text>
      <FlatList
        data={chatData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.chatItem}>
            <Text style={styles.chatSender}>{item.sender}:</Text>
            <Text style={styles.chatMessage}>{item.message}</Text>
          </View>
        )}
      />
      <View style={styles.chatInputContainer}>
        <TextInput style={styles.chatInput} placeholder="메시지를 입력하세요" />
        <TouchableOpacity style={styles.chatSendButton} onPress={() => Alert.alert("채팅", "메시지 전송")}>
          <Text style={styles.chatSendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch(activeTab) {
      case 'home':
        return renderHome();
      case 'board':
        return renderBoard();
      case 'gallery':
        return renderGallery();
      default:
        return null;
    }
  };

  return (
    <View style={styles.mainContainer}>
      {renderTabBar()}
      {activeTab === 'home' ? (
        <ScrollView style={styles.container}>
          {meetingInfo && (
            <View style={styles.imageContainer}>
              <TouchableOpacity onPress={() => setMainImageModalVisible(true)}>
                <Image source={{ uri: meetingInfo.imageUrl }} style={styles.meetingImage} />
              </TouchableOpacity>
              {isOrganizer && (
                <TouchableOpacity
                  style={styles.imageSettingsButton}
                  onPress={handleChangeMeetingImage}
                >
                  <Ionicons name="settings" size={24} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}
          {renderTabContent()}
        </ScrollView>
      ) : (
        <View style={styles.container}>
          {renderTabContent()}
        </View>
      )}

<Modal visible={modalVisible} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>정기모임 등록</Text>
                <TextInput
                  placeholder="제목"
                  value={periodicTitle}
                  onChangeText={setPeriodicTitle}
                  style={styles.input}
                />
                <TextInput
                  placeholder="설명"
                  value={periodicDescription}
                  onChangeText={setPeriodicDescription}
                  style={[styles.input, { height: 80 }]}
                  multiline={true}
                />
                {/* DateTimePicker를 통해 날짜 선택 */}
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerButtonText}>
                    {periodicDate ? periodicDate.toLocaleDateString() : '날짜 선택'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={periodicDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setPeriodicDate(selectedDate);
                      }
                    }}
                  />
                )}
                <TextInput
                  placeholder="시간 (예: 09:00)"
                  value={periodicTime}
                  onChangeText={setPeriodicTime}
                  style={styles.input}
                />
                <TextInput
                  placeholder="장소"
                  value={periodicLocation}
                  onChangeText={setPeriodicLocation}
                  style={styles.input}
                />
                <TextInput
                  placeholder="비용"
                  value={periodicCost}
                  onChangeText={setPeriodicCost}
                  style={styles.input}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="정기모임 최대 인원"
                  value={periodicMax}
                  onChangeText={setPeriodicMax}
                  style={styles.input}
                  keyboardType="numeric"
                />
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity style={styles.modalButton} onPress={handleRegisterPeriodic}>
                    <Text style={styles.modalButtonText}>등록</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>취소</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        visible={boardModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBoardModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setBoardModalVisible(false)}>
          <View style={styles.modalContainer}>
            {/* 내부 컨텐츠 터치 시 모달이 닫히지 않도록 별도 TouchableWithoutFeedback */}
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>게시글 등록</Text>
                <TextInput
                  style={styles.input}
                  placeholder="제목을 입력하세요"
                  value={boardTitle}
                  onChangeText={setBoardTitle}
                />
                <TextInput
                  style={[styles.input, { height: 100 }]}
                  placeholder="내용을 입력하세요"
                  value={boardContent}
                  onChangeText={setBoardContent}
                  multiline
                />
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      handleBoardRegister();
                    }}
                  >
                    <Text style={styles.modalButtonText}>등록</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                    onPress={() => setBoardModalVisible(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#000' }]}>취소</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

   

        <Modal
  visible={extendModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setExtendModalVisible(false)}
>
  <View style={styles.extendModalContainer}>
    <View style={styles.extendModalContent}>
      <Text style={styles.extendModalText}>
        모임 유지 기간: {remainingDays}일
      </Text>
      {remainingDays <= 7 && (
        <Text style={styles.warningText}>
          잔여일이 끝나면 자동으로 모임이 삭제됩니다.
        </Text>
      )}
      <View style={styles.extendButtonRow}>
      <TouchableOpacity 
  style={styles.extendButton} 
  onPress={() => {
    setExtendModalVisible(false);
    setTimeout(() => {
      setExtendOptionModalVisible(true);
    }, 300); // 300ms 딜레이, 필요에 따라 조정하세요.
  }}
>
  <Text style={styles.extendButtonText}>연장하기</Text>
</TouchableOpacity>
        <TouchableOpacity 
          style={styles.cancelExtendButton}
          onPress={() => setExtendModalVisible(false)}
        >
          <Text style={styles.cancelExtendButtonText}>취소</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


<Modal 
  visible={extendOptionModalVisible} 
  transparent 
  animationType="slide"
  onRequestClose={() => setExtendOptionModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={() => setExtendOptionModalVisible(false)}>
    <View style={styles.extensionModalContainer}>
      <View style={styles.extensionModalContent}>
        <Text style={styles.extensionModalTitle}>연장 옵션 선택</Text>
        <TouchableOpacity 
          style={styles.extensionOption} 
          onPress={() => handleExtend(1)}
        >
          <Text style={styles.extensionOptionText}>150개 - 1개월</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.extensionOption} 
          onPress={() => handleExtend(3)}
        >
          <Text style={styles.extensionOptionText}>400개 - 3개월</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.extensionOption} 
          onPress={() => handleExtend(6)}
        >
          <Text style={styles.extensionOptionText}>700개 - 6개월</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cancelExtensionButton}
          onPress={() => setExtendOptionModalVisible(false)}
        >
          <Text style={styles.cancelExtensionButtonText}>취소</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableWithoutFeedback>
</Modal>
<Modal
  visible={imageModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setImageModalVisible(false)}
>
  <TouchableOpacity
    style={styles.imageModalContainer}
    activeOpacity={1}
    onPress={() => setImageModalVisible(false)}
  >
    <View style={styles.imageModalContent}>
      {isOrganizer && (
        <TouchableOpacity 
          style={styles.deleteButtonContainer}
          onPress={() => handleDeleteImage(selectedImage.id, selectedImage.imageUrl)}
        >
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
      )}
      {selectedImage && (
        <Image
          source={{ uri: selectedImage.imageUrl }}
          style={styles.fullImage}
        />
      )}
    </View>
  </TouchableOpacity>
</Modal>

<Modal
        visible={mainImageModalVisible}
        transparent={true}
        animationType="fade"
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
        onPress={() => setMainImageModalVisible(false)}
      >
        <Ionicons name="close" size={24} color="white" />
      </TouchableOpacity>


        <ImageViewer
          imageUrls={[{ url: meetingInfo?.imageUrl }]}
          enableSwipeDown={true}
          onSwipeDown={() => setMainImageModalVisible(false)}
          renderIndicator={() => null}  // 인디케이터 숨기기 (원하는 경우)
        />
      </Modal>


<Modal
  visible={kickModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setKickModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={() => setKickModalVisible(false)}>
    <View style={styles.modalOverlay}>
      <TouchableWithoutFeedback>
        <View style={styles.kickModalContainer}>
          <Text style={styles.kickModalTitle}>옵션 선택</Text>

          {/* 
            🔽 모임장 본인이라면 "추방하기" 버튼 표시 X 
            즉, selectedMember?.externalUserId !== meetingInfo?.externalUserId 인 경우에만 표시
          */}
          {selectedMember?.externalUserId !== meetingInfo?.externalUserId && (
            <TouchableOpacity
              style={styles.kickModalButton}
              onPress={() => handleKickMember(selectedMember)}
            >
              <Text style={styles.kickModalButtonText}>추방하기</Text>
            </TouchableOpacity>
          )}

          {/* 프로필 보기 버튼 */}
          <TouchableOpacity
            style={styles.kickModalButton}
            onPress={() => {
              setKickModalVisible(false);
              navigation.navigate('ProfileViewScreen', {
                externalUserId: selectedMember?.externalUserId,
              });
            }}
          >
            <Text style={styles.kickModalButtonText}>프로필 보기</Text>
          </TouchableOpacity>

          {/* 닫기 / 취소 버튼 */}
          <TouchableOpacity
            style={[styles.kickModalButton, { backgroundColor: '#ccc' }]}
            onPress={() => setKickModalVisible(false)}
          >
            <Text style={[styles.kickModalButtonText, { color: '#000' }]}>
              취소
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>
{/* Organizer용: 모임 정보 수정 모달 */}
<Modal visible={editMeetingModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>모임 정보 수정</Text>
              <TextInput
                style={styles.input}
                placeholder="모임 제목"
                value={editedTitle}
                onChangeText={setEditedTitle}
              />
              <TouchableOpacity style={styles.selector} onPress={() => {
                
                    setTimeout(() => {
                      setLocationModalVisible(true);
                    }, 300); // 300ms 딜레이, 필요에 따라 조정하세요.
              }}>
                <Text style={styles.selectorText}>{location || '지역 선택'}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="모임 내용"
                value={editedDescription}
                onChangeText={setEditedDescription}
                multiline
              />
              {/* 최대 인원 조절 영역 */}
              <View style={styles.participantsContainer}>
                <Text style={styles.participantsLabel}>최대 인원:</Text>
                <View style={styles.buttonGroup}>
                  {/* - 버튼: 30명 이하로 내려가지 않도록 */}
                  <TouchableOpacity
                    onPress={() => setEditedMaxParticipants(prev => Math.max(30, prev - 10))}
                    disabled={editedMaxParticipants === 30}
                  >
                    <Text style={[styles.participantButton, editedMaxParticipants === 30 && styles.disabled]}>-</Text>
                  </TouchableOpacity>
                  
                  {/* 현재 최대 인원 표시 */}
                  <Text style={styles.participantCount}>{editedMaxParticipants}명</Text>
                  
                  {/* + 버튼: 300명 이상 올라가지 않도록 */}
                  <TouchableOpacity
                    onPress={() => setEditedMaxParticipants(prev => Math.min(300, prev + 10))}
                    disabled={editedMaxParticipants === 300}
                  >
                    <Text style={[styles.participantButton, editedMaxParticipants === 300 && styles.disabled]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity style={styles.modalButton} onPress={handleUpdateMeeting}>
                  <Text style={styles.modalButtonText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setEditMeetingModalVisible(false)}>
                  <Text style={styles.modalButtonText}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
        {/* 🔹 중첩된 지역 선택 모달 */}
  <Modal
    visible={locationModalVisible}
    transparent
    animationType="fade"
    onRequestClose={() => setLocationModalVisible(false)}
  >
    <TouchableWithoutFeedback onPress={() => setLocationModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback>
          <View style={styles.locationModal}>
            <Text style={styles.modalTitle}>지역 선택</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="동, 읍, 면 검색"
              value={searchQuery}
              onChangeText={handleSearchLocation}
              autoFocus
            />
            <FlatList
              data={filteredLocations}
              keyExtractor={(item, idx) => `${item.key}-${idx}`}
              style={styles.locationList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.locationItem,
                    editedLocation === `${item.시군구명} ${item.읍면동명}` && styles.selectedLocation
                  ]}
                  onPress={() => {
                    selectLocation(item);
                    setEditedLocation(`${item.시군구명} ${item.읍면동명}`);
                  }}
                >
                  <Text style={styles.locationText}>
                    {item.시군구명} {item.읍면동명}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setLocationModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
      </Modal>


    </View>
  );
  
  
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
  },
  meetingImage: {
    width: "100%",
    height: 200,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFA2B7",
    paddingVertical: 5,
  },
  tabBarOverlay: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
  },
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
  },
  tabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  contentContainer: {
    padding: 15,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  gearIcon: {
    marginLeft: 8,
    color: '#333',
  },
  location: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: "#999",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: "#555",
  },
  joinButton: {
    backgroundColor: "#FF7890",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  tabContentContainer: {
    flex: 1,
    position: 'relative', // 하위의 absolute 요소 기준
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  tabTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  boardItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 10,
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  boardNickname: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    // 필요한 경우 추가 스타일 적용
  },
  boardTime: {
    fontSize: 12,
    color: '#777',
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  boardContent: {
    fontSize: 16,
    color: '#555',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF7890',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 50,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  galleryImageContainer: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    margin: 5,
    borderRadius: 10,
    overflow: 'hidden',
    padding: 5, // 내부 패딩 추가
  },
  galleryImage: {
    flex: 1,
    resizeMode: 'cover',
    borderRadius: 5, // 컨테이너의 borderRadius에서 패딩 만큼 줄여줌
  },
  
  
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  chatSender: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 5,
  },
  chatMessage: {
    fontSize: 16,
    color: "#555",
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginTop: 15,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
  },
  chatSendButton: {
    backgroundColor: "#FF7890",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  chatSendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  recurringContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  recurringTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  recurringDescription: {
    fontSize: 16,
    color: "#555",
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: colors.primary || "#FF7890",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
	memberSection: {
		marginTop: 30,
		paddingHorizontal: 15,
	},
	memberCount: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 10,
		color: "#333",
	},
	memberItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 15,
	},
	memberImage: {
		width: 80,
		height: 80,
		borderRadius: 40,
	},
	memberInfo: {
		marginLeft: 10,
	},
	memberNickname: {
		fontSize: 16,
		fontWeight: "600",
	},
	memberAge: {
		fontSize: 14,
		color: "#777",
	},
	memberSection: {
		marginTop: 30,
		paddingHorizontal: 15,
	},
	memberCount: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
		color: '#333',
	},
	memberGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	memberItem: {
		width: (width - 60) / 3, // 3열 그리드를 위한 너비 (여백 60px 가정)
		marginBottom: 15,
		alignItems: 'center',
	},
	memberImage: {
		width: 80,
		height: 80,
		borderRadius: 40,
		marginBottom: 5,
	},
	memberNickname: {
		fontSize: 16,
		fontWeight: '600',
	},
	memberAge: {
		fontSize: 14,
		color: '#777',
	},
	registerButton: {
    backgroundColor: colors.primary || "#FF7890",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginVertical: 5,
    fontSize: 16,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#FF7890',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  periodicItem: {
    width: width - 100, // 양쪽 padding 15 고려
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden', // 이 속성을 추가하여 모서리가 잘림 처리되도록 함
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  
  periodicItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  periodicItemDate: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  periodicItemLocation: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  periodicItemCost: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  periodicItemMax: {
    fontSize: 16,
    color: '#555',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    borderRadius: 10,
  },
  imageDate: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  deleteButtonContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    top: -50
  },
  deleteButton: {
    backgroundColor: '#FF4D4D',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardDeleteButton: {
    backgroundColor: '#FF4D4D',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  boardDeleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  periodicDeleteButton: {
    backgroundColor: '#FF4D4D',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  periodicDeleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  extendModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extendModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  extendModalText: {
    fontSize: 18,
    marginBottom: 15,
  },
  extendButton: {
    backgroundColor: colors.primary || "#FF7890",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  extendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  extendModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extendModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  extendModalText: {
    fontSize: 18,
    marginBottom: 15,
  },
  warningText: {
    fontSize: 14,
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  extendButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  extendButton: {
    backgroundColor: colors.primary || "#FF7890",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  extendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelExtendButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  cancelExtendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  extensionModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  extensionModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  extensionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  extensionOption: {
    backgroundColor: colors.primary || "#FF7890",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    width: '100%',
    alignItems: 'center',
  },
  extensionOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelExtensionButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
  },
  cancelExtensionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: -50,
    right: 10,
    backgroundColor: '#FF4D4D',
    padding: 8,
    borderRadius: 5,
    zIndex: 1,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kickModalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    // 추가 스타일...
  },
  kickModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  kickModalButton: {
    backgroundColor: '#FF7890',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  kickModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selector: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 10 },
  selectorText: { color: '#555' },
  searchInput: {
		width: '100%',
		padding: 10,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 5,
		marginBottom: 10,
	},
	locationList: {
		width: '100%',
		maxHeight: 200, // ✅ 리스트 높이 제한
	},
	locationItem: {
		paddingVertical: 12,
		paddingHorizontal: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	selectedLocation: {
		backgroundColor: '#C3C3C3', // ✅ 선택된 항목 색상 변경
		borderRadius: 5,
	},
	locationText: {
		fontSize: 16,
		color: '#333',
	},
  locationModal: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 10,
		width: '85%',
		maxHeight: '75%', // ✅ 높이 제한
		alignItems: 'center',
	},
  closeButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#FF7890',
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageSettingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  participantsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantButton: {
    fontSize: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  participantCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
  
});
