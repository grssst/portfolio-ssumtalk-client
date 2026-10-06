import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, Modal, FlatList, TouchableWithoutFeedback, Keyboard, Dimensions, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, CommonActions } from '@react-navigation/native';
import locations from '../assets/locations.json';
import EncryptedStorage from 'react-native-encrypted-storage';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, getToken, subscribeToTopic, unsubscribeFromTopic } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 이거 추가좀 돼라 씨발
import Constants from 'expo-constants';
const { width, height } = Dimensions.get('window');

export default function WriteMeetingScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState(null);
  const [location, setLocation] = useState(null);
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false); 

  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
	const API_URL = Constants.expoConfig.extra.API_URL;
  //const API_URL = "http://192.168.0.2:5000" // http:// 추가
  const topics = ['취미', '운동/스포츠', '술', '산책', '독서', '게임', '드라이브', '보드게임', '친목', '자기계발', '전시회', '여행'];


    const app = getApp(); // 기본 Firebase 앱 인스턴스
    const messagingInstance = getMessaging(app);


  // 🔹 이미지 선택
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9], // 16:9 비율
      quality: 0.5,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // 🔹 토픽 선택
  const selectTopic = (selected) => {
    setTopic(selected);
    setTopicModalVisible(false);
  };

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
const handleSendMessage = async (nickname, meetingId) => {
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
      console.log(meetingId);
      const sendMessageData = {
        recipientId: meetingId, // ID
        messageContent: nickname+"가 가입했습니다.",   // 보낸 메시지 내용
        isMeeting: true,
      };

  
      // 서버로 데이터 전송
      const response = await fetch(`${API_URL}/api/userChatRooms/first-send-message-meeting-create`, {
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


  const handleJoin = async (meetingId) => {
      try {
        const token = await EncryptedStorage.getItem('userToken');
        if (!token) {
          Alert.alert("다시 로그인 해주세요.");
          navigation.navigate("LoginScreen");
          return;
        }
        const response = await fetch(
          `${API_URL}/api/meeting/join-meeting?meetingId=${meetingId}&firstCreate=${true}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
    
        if (response.ok) {
          // 응답이 JSON 형식인지 확인합니다.
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            console.log(data);
            // data 처리
          } else {
            // JSON이 아닌 경우 text로 처리
            const text = await response.text();
      
  
            handleSendMessage("모임 대표", meetingId);
  
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


    const subscribeToUserTopics = async (data) => {
      const { meetingId, creatorUserId } = data;
      const topic = `meeting_${meetingId}`;
    
      try {
        const stored = await AsyncStorage.getItem('meetingTopics');
        let topics = stored ? JSON.parse(stored) : [];  // ✅ 타입 제거
    
        if (!topics.includes(topic)) {
          topics.push(topic);
          await AsyncStorage.setItem('meetingTopics', JSON.stringify(topics));
        }
    
        const savedSetting = await AsyncStorage.getItem('pushNotification');
        const isPushOn = savedSetting === null || savedSetting === 'true';
    
        if (!isPushOn) {
          console.log('🔕 전체 푸시 OFF 상태라, 토픽만 저장하고 구독은 하지 않습니다:', topic);
          return;
        }
    
        if (creatorUserId != null) {
          await subscribeToTopic(messagingInstance, topic);
          console.log('✅ 그룹 푸시 구독:', topic);
        }
    
      } catch (error) {
        console.error('토픽 가입/저장 중 오류:', error);
      }
    };
    

	// 🔹 구독 안내 모달에서 "확인" 클릭 시 실행
	const handleConfirm = async () => {
		setModalVisible(false);
	
		const formData = new FormData();
formData.append('title', title);
formData.append('description', description);
formData.append('topic', topic);
formData.append('location', location);
formData.append('maxParticipants', maxParticipants.toString()); // 숫자는 문자열로 변환

if (selectedImage) {
  formData.append('image', {
    uri: selectedImage,         // Expo ImagePicker에서 반환받은 uri 사용
    name: 'meeting-image.jpg',  // 파일 이름
    type: 'image/jpeg',         // MIME 타입 (예: 'image/jpeg')
  });
}

	
		try {
			const token = await EncryptedStorage.getItem('userToken');

			const response = await fetch(`${API_URL}/api/meeting/create-meeting`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
				body: formData,
			});
	
			if (response.ok) {
				const data = await response.json(); // 응답 데이터를 JSON으로 파싱
        console.log("생성된 모임 ID:", data); // data에는 미팅 ID가 포함되어 있음
        Alert.alert('성공', '모임이 생성되었습니다!');
        subscribeToUserTopics(data);

        handleJoin(data.meetingId);


				navigation.goBack();
			} else {
				Alert.alert('등록 실패', '모임 생성에 실패했습니다.');
			}
		} catch (error) {
			console.error('Error:', error);
			Alert.alert('등록 실패', '모임 생성 중 오류가 발생했습니다.');
		}
	};
	
	

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="모임 제목 (최대 20자)"
          maxLength={20}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.description]}
          placeholder="모임 설명"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.image} />
          ) : (
            <Text style={styles.imageText}>이미지 선택</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.selector} onPress={() => setTopicModalVisible(true)}>
          <Text style={styles.selectorText}>{topic || '카테고리 선택'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.selector} onPress={() => setLocationModalVisible(true)}>
          <Text style={styles.selectorText}>{location || '지역 선택'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>등록</Text>
        </TouchableOpacity>

				<View style={styles.participantsContainer}>


				<Text style={styles.participantsLabel}>최대 인원:</Text>
				<View style={styles.buttonGroup}>
					{/* 🔽 감소 버튼 (최소 30명) */}
					<TouchableOpacity
						onPress={() => setMaxParticipants((prev) => Math.max(30, prev - 10))}
						disabled={maxParticipants === 30}
					>
						<Text style={[styles.participantButton, maxParticipants === 30 && styles.disabled]}>-</Text>
					</TouchableOpacity>

					{/* ✅ 참가자 숫자 표시 */}
					<Text style={styles.participantCount}>{maxParticipants}명</Text>

					{/* 🔼 증가 버튼 (최대 300명) */}
					<TouchableOpacity
						onPress={() => setMaxParticipants((prev) => Math.min(300, prev + 10))}
						disabled={maxParticipants === 300}
					>
						<Text style={[styles.participantButton, maxParticipants === 300 && styles.disabled]}>+</Text>
					</TouchableOpacity>
				</View>
			</View>




       {/* 🔹 카테고리 선택 모달 */}
<Modal visible={topicModalVisible} transparent animationType="fade">
  <TouchableWithoutFeedback onPress={() => setTopicModalVisible(false)}>
    <View style={styles.modalOverlay}>
      <View style={styles.categoryModal}>
        <FlatList
          data={topics}
          keyExtractor={(item) => item}
          numColumns={2} // ✅ 3줄 → 2줄로 변경
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.categoryButton} onPress={() => selectTopic(item)}>
              <Text style={styles.categoryText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity onPress={() => setTopicModalVisible(false)} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>닫기</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableWithoutFeedback>
</Modal>



				
				<Modal visible={modalVisible} transparent animationType="fade">
					<View style={styles.modalOverlay}>
						<View style={styles.subscriptionModal}>
							<Text style={styles.modalTitle}>구독 안내</Text>
							<Text style={styles.modalText}>
								이 모임은 처음 30일간 무료이며 이후 매월 {150} 캔디가 결제됩니다.
							</Text>
							<View style={styles.submitButtonAll}>
								<TouchableOpacity style={styles.submitCancelButton} onPress={() => setModalVisible(false)}>
								<Text style={styles.submitCancelButtonText}>취소</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.submitButton} onPress={handleConfirm}>
								<Text style={styles.submitButtonText}>확인</Text>
							</TouchableOpacity>
							</View>
							
						</View>
					</View>
				</Modal>

        {/* 🔹 지역 선택 모달 */}
        <Modal visible={locationModalVisible} transparent animationType="fade">
  <TouchableWithoutFeedback onPress={() => setLocationModalVisible(false)}>
    <View style={styles.modalOverlay}>
      <View style={styles.locationModal}>
        <Text style={styles.modalTitle}>지역 선택</Text>
        
        {/* 🔹 검색 입력 필드 */}
        <TextInput
          style={styles.searchInput}
          placeholder="동, 읍, 면 검색"
          value={searchQuery}
          onChangeText={handleSearchLocation}
        />
        
        {/* 🔹 검색 결과 리스트 */}
        <FlatList
          data={filteredLocations}
          keyExtractor={(item, index) => `${item.key}-${index}`} // ✅ 중복 키 방지
          style={styles.locationList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.locationItem, 
                location === `${item.시군구명} ${item.읍면동명}` && styles.selectedLocation
              ]} 
              onPress={() => selectLocation(item)}
            >
              <Text style={styles.locationText}>{item.시군구명} {item.읍면동명}</Text>
            </TouchableOpacity>
          )}
        />
        
        {/* 🔹 닫기 버튼 */}
        <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>닫기</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableWithoutFeedback>
</Modal>
      </View>
    </TouchableWithoutFeedback>
		
  );
}




const styles = StyleSheet.create({
	container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { width: width * 0.8, backgroundColor: '#fff', padding: 20, borderRadius: 10 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  closeText: { fontSize: 16, color: 'blue', textAlign: 'center', marginTop: 10 },
  searchInput: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 5, marginBottom: 10 },


  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 10 },
  description: { height: 80, textAlignVertical: 'top' },
  selector: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 10 },
  selectorText: { color: '#555' },
  imagePicker: { height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee', borderRadius: 5, marginBottom: 10 },
  image: { width: '100%', height: '100%', borderRadius: 5 },
	submitButtonAll: { 
		flexDirection: 'row', 
		justifyContent: 'center', // 버튼들을 중앙 정렬
		width: '100%', 
		marginTop: 10, 
		gap: 10, // 버튼 사이 간격 추가
	},
  submitButton: { backgroundColor: '#FF7890', padding: 15, borderRadius: 5, alignItems: 'center', },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
	submitCancelButton: { backgroundColor: '#999', padding: 15, borderRadius: 5, alignItems: 'center' },
  submitCancelButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonGroup: { flexDirection: 'row' },
	participantsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		marginTop: 5,
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
		paddingHorizontal: 10,
		paddingVertical: 5,
		backgroundColor: '#ddd',
		borderRadius: 5,
		marginHorizontal: 5,
	},
	participantCount: {
		fontSize: 18,
		//fontWeight: 'bold',
	},
	disabled: {
		opacity: 0.5,
	},
	
  disabled: { opacity: 0.5 },
	modalOverlay: { 
		flex: 1, 
		justifyContent: 'center', 
		alignItems: 'center', 
		backgroundColor: 'rgba(0, 0, 0, 0.5)' 
	},
	subscriptionModal: { 
		width: width * 0.8, 
		backgroundColor: '#fff', 
		padding: 20, 
		borderRadius: 10, 
		alignItems: 'center' 
	},
	modalTitle: { 
		fontSize: 18, 
		fontWeight: 'bold', 
		marginBottom: 10 
	},
	modalText: { 
		fontSize: 16, 
		textAlign: 'center', 
		marginBottom: 20 
	},
	categoryModal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%', // ✅ 화면을 넘어가지 않도록 제한
    width: '80%',
    alignItems: 'center',
  },
  categoryButton: {
    backgroundColor: '#eee',
    paddingVertical: 10, // ✅ 버튼 높이 조정
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center', // ✅ 중앙 정렬
    justifyContent: 'center', // ✅ 중앙 정렬
    margin: 5,
    minWidth: 80, // ✅ 버튼 최소 너비 설정
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center', // ✅ 글자 중앙 정렬
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
	locationModal: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 10,
		width: '85%',
		maxHeight: '75%', // ✅ 높이 제한
		alignItems: 'center',
	},
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
});
