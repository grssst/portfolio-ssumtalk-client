import React, { useState, useMemo, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import locations from '../assets/locations.json'; // ✅ JSON 데이터 불러오기
import { Ionicons } from "@expo/vector-icons"; // 돋보기 아이콘 추가
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'; // 내비게이션 사용을 위해 추가
import fuseInstance from './fuseInstance'; // 경로에 맞게 수정

export default function SearchLocation() {
  const [searchQuery, setSearchQuery] = useState('');
const route = useRoute();
  const [selectedLocations, setSelectedLocations] = useState([]);
	const navigation = useNavigation(); // 내비게이션 훅 사용
   // Fuse 옵션 설정: 검색 대상 키와 민감도 등을 지정할 수 있습니다.
	 const fuseOptions = {
    keys: ['시군구명', '읍면동명'],
    threshold: 0.3, // 0에 가까울수록 정확한 일치, 1에 가까울수록 느슨한 매칭
  };

	useEffect(() => {
		if (route.params?.filter) {
			const { location: filterLocation } = route.params.filter;
			if (Array.isArray(filterLocation) && filterLocation.length > 0) {
				const preSelectedItems = locations
					.filter(item => filterLocation.includes(`${item.시군구명} ${item.읍면동명}`))
					.map(item => ({
						key: `${item.시군구명} ${item.읍면동명}`,
						시군구명: item.시군구명,
						읍면동명: item.읍면동명,
					}));
				// 중복 제거: 각 key 값이 유일한지 확인
				const uniqueItems = preSelectedItems.filter((item, index, self) =>
					index === self.findIndex(t => t.key === item.key)
				);
				setSelectedLocations(uniqueItems);
				setSearchQuery(uniqueItems[0]?.key || '');
			} else if (typeof filterLocation === 'string' && filterLocation && filterLocation !== '전체지역') {
				const matchingLocations = locations
					.filter(item => `${item.시군구명} ${item.읍면동명}` === filterLocation)
					.map(item => ({
						key: `${item.시군구명} ${item.읍면동명}`,
						시군구명: item.시군구명,
						읍면동명: item.읍면동명,
					}));
				setSelectedLocations(matchingLocations);
				setSearchQuery(filterLocation);
			}
		}
	}, [route.params]);
	

// useMemo로 검색 결과를 캐싱 (fuseInstance를 직접 사용)
const filteredResults = useMemo(() => {
	if (searchQuery.trim() === '') return [];
	const results = fuseInstance.search(searchQuery);
	return results.map(result => {
		const key = `${result.item.시군구명} ${result.item.읍면동명}`;
		return {
			key,
			시군구명: result.item.시군구명,
			읍면동명: result.item.읍면동명,
		};
	});
}, [searchQuery]);
	

  const handleSearch = (text) => {
    setSearchQuery(text);
  };
	

  const handleConfirm = () => {
		navigation.navigate('meeting', { selectedLocations: selectedLocations.map(loc => loc.key) }); // ✅ 선택한 위치 배열로 전달
	};
	
	

  // 🔹 선택된 위치 추가 (시군구명 + 읍면동명 저장)
  const handleSelectLocation = (location) => {
    if (!selectedLocations.some((loc) => loc.key === location.key)) {
      setSelectedLocations([...selectedLocations, location]);
    }
  };

  // 🔹 선택된 위치 제거
  const handleRemoveLocation = (locationKey) => {
    setSelectedLocations(selectedLocations.filter((loc) => loc.key !== locationKey));
  };

  return (
    <View style={styles.container}>
      {/* 🔍 검색 입력 필드 */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={24} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="동, 읍, 면을 입력하세요"
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus={true} // 화면 열리면 자동으로 포커스
          placeholderTextColor="#999"
        />
      </View>

      {/* 🔹 선택된 태그 (읍면동명만 표시) */}
      <View style={styles.selectedTagsContainer}>
        {selectedLocations.map((location) => (
          <TouchableOpacity
            key={location.key}
            style={styles.selectedTag}
            onPress={() => handleRemoveLocation(location.key)}
          >
            <Text style={styles.selectedTagText}>{location.읍면동명} ✕</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🔹 검색 결과 리스트 (시군구명 + 읍면동명 표시) */}
      <FlatList
        data={filteredResults}
        keyExtractor={(item, index) => `${item.key}-${index}`}

        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectLocation(item)}>
            <Text style={styles.resultText}>
              {item.시군구명} {item.읍면동명}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* 확인 버튼 항상 표시 */}
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>확인</Text>
      </TouchableOpacity>
    </View>
  );
}

// 🔹 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    fontSize: 16, // 🔹 글자 크기 증가
    paddingVertical: 5,
    color: "#333",
  },
  icon: {
    marginRight: 8,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  selectedTag: {
    backgroundColor: '#4CAF50',
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTagText: {
    color: '#fff',
    fontSize: 16, // 🔹 글자 크기 증가
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  resultText: {
    fontSize: 16, // 🔹 글자 크기 증가
  },
  confirmButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF7890',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
