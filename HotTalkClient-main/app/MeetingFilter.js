import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import colors from './styles/colors';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function MeetingFilter({ applyFilters, showWriteButton = true }) {
  // 정렬 상태 (기본값: '인기순')
  const [sort, setSort] = useState('pop');
	const navigation = useNavigation(); // 내비게이션 훅 사용
  // 지역 필터
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState('전체지역'); 
  const route = useRoute(); // ✅ 라우트 데이터 가져오기
  const [selectedTopics, setSelectedTopics] = useState([]); // 실제 적용되는 주제
  const [tempSelectedTopics, setTempSelectedTopics] = useState([]); // 모달 내에서 임시 선택된
  // 주제 모달 상태
  const [topicModalVisible, setTopicModalVisible] = useState(false);

  // 선택 가능한 주제 리스트
  const topics = ['취미', '운동/스포츠', '술', '산책', '독서', '게임', '드라이브', '보드게임', '친목', '자기계발', '전시회', '여행', '사진', '노래', '업무', '댄스'];

  // 🔹 네비게이션에서 돌아왔을 때 location 업데이트
  useEffect(() => {
    if (route.params?.selectedLocations) {
      setLocation(route.params.selectedLocations); // ✅ 배열로 저장
    }
  }, [route.params?.selectedLocations]);
  

  // 정렬 버튼 (인기순 ↔ 레벨순)
  const handleToggleSort = () => {
    setSort(prevSort => (prevSort === 'pop' ? 'level' : 'pop'));
  };

  // 🔹 주제 선택 토글 (모달 내에서만 변경)
  const toggleTopic = (topic) => {
    setTempSelectedTopics(prevTopics => {
      if (prevTopics.includes(topic)) {
        return prevTopics.filter(t => t !== topic); // 선택 해제
      } else {
        return [...prevTopics, topic]; // 선택 추가
      }
    });
  };

  // 🔹 "적용" 버튼을 눌렀을 때만 주제 필터 적용
  const applyTopics = () => {
    setSelectedTopics(tempSelectedTopics); // 실제 필터 반영
    setTopicModalVisible(false);
    applyFilters?.({ location, selectedTopics: tempSelectedTopics }); // 필터 적용
  };

  // 필터 값이 변경될 때마다 콜백 실행
  useEffect(() => {
    applyFilters?.({ sort, location, selectedTopics });
  }, [sort, location, selectedTopics]);

  return (
    <>
      <View style={styles.filterBarContainer}>
        {/* 정렬 버튼 
        <TouchableOpacity style={styles.blackButton} onPress={handleToggleSort}>
          <Text style={styles.buttonText}>{sort === 'pop' ? '인기순' : '레벨순'}</Text>
        </TouchableOpacity>
				*/}

        {/* 지역 선택 버튼 */}
        <TouchableOpacity 
  style={styles.blackButton} 
  onPress={() => {
    const filterData = { sort, location, selectedTopics };
    console.log('전달하는 필터 내용:', filterData);
    navigation.navigate('SearchLocation', { filter: filterData });
  }}
>
  <Text style={styles.buttonText}>지역</Text>
</TouchableOpacity>



        {/* 주제 버튼 (모달 오픈) */}
        <TouchableOpacity style={styles.blackButton} onPress={() => setTopicModalVisible(true)}>
          <Text style={styles.buttonText}>주제</Text>
        </TouchableOpacity>

        {/* 글쓰기 버튼 */}
        {showWriteButton && (
          <TouchableOpacity style={styles.writeButton} onPress={() => navigation.navigate('WriteMeetingScreen')}>
            <Text style={styles.writeButtonText}>모임생성</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 주제 선택 모달 */}
      <Modal
        visible={topicModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTopicModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setTopicModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>모임 주제 선택</Text>
          <FlatList
            data={topics}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.topicItem, 
                  tempSelectedTopics.includes(item) && styles.selectedTopic
                ]}
                onPress={() => toggleTopic(item)}
              >
                <Text style={[
                  styles.topicText, 
                  tempSelectedTopics.includes(item) && styles.selectedTopicText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
						style={{ maxHeight: height * 0.4 }} // 📌 최대 높이 제한 (화면의 40%)
      			keyboardShouldPersistTaps="handled" // 📌 스크롤 중에도 탭 가능
          />
          <TouchableOpacity style={styles.applyButton} onPress={applyTopics}>
            <Text style={styles.applyButtonText}>적용</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* 하단 필터 바 컨테이너 */
  filterBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // 왼쪽 정렬
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingBottom: 7,
        paddingTop: Platform.OS === 'android' ? 5 : 0,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    // 전체 왼쪽에 조금의 공백을 주고 싶다면 (없애려면 0으로)
    paddingLeft: 10,
    position: 'absolute',
    top:0,
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    width: 30000,
        height: 30000,
    backgroundColor: 'rgba(0, 0, 0, 0)', // 투명 배경
    zIndex: 2, // 다른 요소보다 위에 표시
  },
  /* 공통 검정 버튼 스타일 (정렬, 나이 버튼) */
  blackButton: {
    backgroundColor: '#111',
    borderRadius: 13,  // 타원형
    height: 25,        // 다른 필터와 동일 높이
    paddingHorizontal: 12,
    marginRight: 5,   // 버튼 사이 간격
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: Platform.OS === 'android' ? '500' : '700',
    letterSpacing: 0.1,
  },

  /* 드롭다운 감싸는 래퍼 */
  dropdownWrapper: {
    // 나란히 배치 시, 오른쪽으로 간격을 주기 위해 marginRight 사용
    marginRight: 5,
    height: 25,
    //width: 50,
    justifyContent: 'center',
        zIndex: 3,
  },
  /* DropDownPicker 관련 스타일 */
  dropdownContainer: {
    height: 25,
    width: 95,
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#111',
    borderColor: '#000',
    borderRadius: 13,
    minHeight: 25,
    //width: 70,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  dropdownInner: {
    borderColor: '#fff',
    shadowColor: '#000', // 그림자 색상
    shadowOffset: { width: 0, height: 2 }, // 그림자 위치
    shadowOpacity: 0.25, // 그림자 투명도
    shadowRadius: 3.84, // 그림자 퍼짐 정도
    elevation: 5, // 안드로이드용 그림자
        backgroundColor: '#FAFAFA',
  },
  // 드롭다운 선택된 텍스트 색상: 검정
  dropdownText: {
    color: '#141414',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
        letterSpacing: 0.4,
  },
  // ▼ 플레이스홀더만 흰색으로 (예: '전체성별' 표기)
  dropdownPlaceholder: {
    fontSize: 12,
    color: '#fff',
  },
  arrowHidden: {
    display: 'none',
    width: 0,
    height: 0,
        
  },
    applyButton: {
    marginTop: 5,
    backgroundColor: colors.main,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
        alignSelf: 'flex-end',
        marginRight: 5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  /* 나이 슬라이더 영역 */
  sliderContainer: {
    position: 'absolute',
    //bottom: 0, // 상황에 맞게 조정
    left: 0,
    right: 0,
    top:35,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1.5,
    borderBottomColor: '#ddd',
    alignItems: 'center',
        zIndex: 3,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: -3,
        color: '#141414',
        fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
  sliderValue: {
    marginTop: 4,
    fontSize: 15,
        color: '#141414',
        fontFamily: Platform.OS === 'android' ? 'TmoneyRoundWindRegular' : 'TmoneyRoundWind-Regular',
  },
writeButton: {
    position: 'absolute',
    right: 10, // 오른쪽 여백
    top: Platform.OS === 'android' ? 5 : 0,
    backgroundColor: '#FF94AC',
    height: 25,        // 다른 필터와 동일 높이
paddingHorizontal: 12,
    borderRadius: 5,
    justifyContent: 'center',
},
writeButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 12 : 13,
fontWeight: Platform.OS === 'android' ? '500' : '700',
    
},
modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
    position: 'absolute',
    top: height / 5,
    left: width * 0.1,
    width: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    },
    modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    },
    topicItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
    },
    selectedTopic: {
    backgroundColor: '#FF94AC',
    },
    topicText: {
    fontSize: 16,
    color: '#333',
    },
    selectedTopicText: {
    color: '#fff',
    },
});
