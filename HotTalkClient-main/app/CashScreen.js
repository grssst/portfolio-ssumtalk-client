import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert, 
  ActivityIndicator, 
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RNIap, { 
  initConnection, 
  getProducts, 
  endConnection,
  requestPurchase,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
  consumePurchaseAndroid,
  getAvailablePurchases,
} from 'react-native-iap';
import Constants from 'expo-constants';
import EncryptedStorage from 'react-native-encrypted-storage';





const androidSkus = [
  'com.grsst.myhottalk.candy_30', 
  'com.grsst.myhottalk.candy_100', 
  'com.grsst.myhottalk.candy_300', 
  'com.grsst.myhottalk.candy_500', 
  'com.grsst.myhottalk.candy_1000', 
  'com.grsst.myhottalk.candy_3000'
];

const iosSkus = [
  'com.grsst.myhottalk.candy_30',
  'com.grsst.myhottalk.candy_100',
  'com.grsst.myhottalk.candy_300',
  'com.grsst.myhottalk.candy_500',
  'com.grsst.myhottalk.candy_1000',
  'com.grsst.myhottalk.candy_3000',
];

const { width } = Dimensions.get('window');


export default function CashScreen() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [candyCount, setCandyCount] = useState(0); // 임시값
  const [initNum, setInitNum] = useState(0);
  const API_URL = Constants.expoConfig.extra.API_URL;
  const navigation = useNavigation();
  var oneReceipt=null;
  let errorHandled = false;


  let isIAPConnected = false;
  let purchaseUpdateSubscription = null;
  let purchaseErrorSubscription = null;

  useEffect(() => {
    fetchRemainingCandy();
    const initializeIAP = async () => {
      try {
        if (!isIAPConnected) {
          try {
            const connected = await initConnection();
            if (connected) {
              //console.log('스토어 연결 성공');
              isIAPConnected = true;
            } else {
              console.error('스토어 연결 실패');
            }
          } catch (error) {
            console.error('스토어 연결 중 오류:', error);
          }
        } else {
          console.log('이미 스토어와 연결되어 있습니다.');
        }
        console.log('IAP 연결 성공');

        const skuList = Platform.OS === 'ios' ? iosSkus : androidSkus;
        const fetchedProducts = await getProducts({ skus: skuList });
        //console.log(fetchedProducts);
        if(Platform.OS === 'android'){
          const sortedProducts = fetchedProducts.sort((a, b) => {
            const priceA = parseInt(a.oneTimePurchaseOfferDetails?.priceAmountMicros || '0', 10);
            const priceB = parseInt(b.oneTimePurchaseOfferDetails?.priceAmountMicros || '0', 10);
            return priceA - priceB;
          });
          setProducts(sortedProducts);
        } else if (Platform.OS === 'ios') {
          const sortedProducts = fetchedProducts.sort((a, b) => {
            const priceA = parseInt(a.price || '0', 10); // price를 숫자로 변환
            const priceB = parseInt(b.price || '0', 10);
            return priceA - priceB;
          });
          setProducts(sortedProducts);
        }
        

      } catch (error) {
        console.error('IAP 초기화 오류:', error);
        Alert.alert('오류', '상품을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeIAP();

    // 구매 업데이트 리스너
    purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
      const token = await EncryptedStorage.getItem('userToken');
        if (!token) {
          Alert.alert("다시 로그인 해주세요.");
          navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
          return;
        }
      const receipt = purchase.transactionReceipt;
      if(oneReceipt === receipt){
        //console.log("리턴함");     //중복된 영수증으로 요청하는것 리턴하기
        return;
      }
      if (receipt) {
        oneReceipt = receipt;
        try {
          setIsLoading(true);
          //console.log("영수증:", receipt);

          let orderId = purchase.orderId;
          //console.log(orderId);
          // Android에서 orderId를 dataAndroid에서 추출
          if (Platform.OS === 'android' && purchase.dataAndroid) {
            try {
              const data = JSON.parse(purchase.dataAndroid); // JSON 문자열 파싱
              orderId = data.orderId; // 파싱된 객체에서 orderId 추출
              //console.log("Android에서 추출한 orderId:", orderId);
            } catch (e) {
              console.error("dataAndroid JSON 파싱 중 오류:", e);
            }
          }

          if(Platform.OS === 'android'){
            //영수증 파싱
          try {
            parsedReceipt = JSON.parse(receipt); // JSON 문자열을 JavaScript 객체로 변환
          } catch (error) {
            console.error("영수증 파싱 실패:", error);
            Alert.alert("구매 오류", "영수증 데이터를 처리하는 중 문제가 발생했습니다. 일정 시간 후 자동 환불됩니다.");
            return;
          }
          
          if(parsedReceipt.purchaseState === 4){   //구글의 느린 반응시
            console.log("구글 플레이의 응답 기다리는중..");
            Alert.alert("오류", "구글 플레이의 응답을 기다리는 중입니다. 잠시후 결제 응답이 돌아오지 않으면 일정 시간 후 자동 환불됩니다.");
          }
          }

          if(Platform.OS === 'android'){
            // 서버로 검증 요청
            const response = await fetch(`${API_URL}/api/candy/purchase/verify/android`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({
                productId: parsedReceipt.productId,
                orderId: parsedReceipt.orderId, // purchase 객체에 orderId 있을 경우 사용
                purchaseToken: parsedReceipt.purchaseToken, // 또는 purchaseToken 필드
                packageName: parsedReceipt.packageName,
                purchaseState: parsedReceipt.purchaseState,
              })
            });
            const result = await response.json();
            
            // 중복 요청 메시지 처리
            if (result.message && result.message.includes("Duplicate entry")) {
              console.log("중복된 요청으로 인해 알림 생략");
              return;
            }
            else if (result.message && result.message.includes("Transaction silently rolled back")) {
              console.log("트랜잭션 롤백으로 인해 알림 생략");
              return;
            } else{
              console.log("서버응답:", result);
            }

            if (result.success) {
              // 1. 구매 트랜잭션 완료
              await finishTransaction({ purchase, isConsumable: true });
              Alert.alert('구매 성공', `구매가 완료되었습니다.`);
              setCandyCount(result.updatedCandy);
              const availablePurchases = await getAvailablePurchases();
              console.log('완료되지 않은 트랜잭션:', availablePurchases);

            } else if(!result.success && parsedReceipt.purchaseState === 4){
              return;
            } else {
              Alert.alert("구매 실패", "구매 검증이 실패했습니다. 일정 시간 후 구매가 자동 환불됩니다.");

            }
          }
          else if(Platform.OS === 'ios'){
            // 서버로 검증 요청
            const response = await fetch(`${API_URL}/api/candy/purchase/verify/ios`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
              },
              body: receipt
            });

            const result = await response.json();
            
            // 중복 요청 메시지 처리
            if (result.message && result.message.includes("Duplicate entry")) {
              console.log("중복된 요청으로 인해 알림 생략");
              return;
            }
            else if (result.message && result.message.includes("Transaction silently rolled back")) {
              console.log("트랜잭션 롤백으로 인해 알림 생략");
              return;
            } else{
              console.log("서버응답:", result);
            }

            if (result.success) {
              // 1. 구매 트랜잭션 완료
              await finishTransaction({ purchase, isConsumable: true });
              Alert.alert('구매 성공', `구매가 완료되었습니다.`);
              setCandyCount(result.updatedCandy);
              const availablePurchases = await getAvailablePurchases();
              console.log('완료되지 않은 트랜잭션:', availablePurchases);

            } else {
              Alert.alert("구매 실패", "구매 검증이 실패했습니다. 서버가 점검중일 수 있습니다. 서버 점검이 끝난 후 다시 캔디 스토어에 접속하면 결제가 마무리 됩니다. 앱스토어에 환불 요청을 하거나 개발자에게 문의하셔도 됩니다.");

            }

          }

        } catch (error) {
          //console.error('구매 처리 오류:', error);
          //Alert.alert('구매 처리 오류', error.message);
        } finally {
          setIsLoading(false);
        }
      }
    });

    // 구매 오류 리스너
    purchaseErrorSubscription = purchaseErrorListener((error) => {

      if(error.responseCode === 1){
        console.log("구매 오류: 사용자가 결제 취소함");
        return;
        //Alert.alert('구매 오류', '사용자가 결제를 취소했습니다.');
      }
      if(error.responseCode === 3){
        console.log("구매 오류: 서비스 에러");
        //Alert.alert('구매 오류', '서비스에 장애가 발생했습니다.');
        return;
      }
      if(error.responseCode === 7){
        console.log("구매 오류: 이미 보유한 아이템");
        //Alert.alert('구매 오류', '서비스에 장애가 발생했습니다.');
        return;
      }
      if(error.responseCode === 5){
        console.log("구매 오류: 결제중인 아이템");
        //Alert.alert('구매 오류', '서비스에 장애가 발생했습니다.');
        return;
      }
      if(error.responseCode === '2'){
        console.log("구매 오류: 사용자가 결제 취소함");
        return;
      }
      Alert.alert('구매 오류', error.message || '결제 중 오류가 발생했습니다.');
      console.error('구매 오류:', error);

    });

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
        purchaseUpdateSubscription = null;
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
        purchaseErrorSubscription = null;
      }
      endConnection();
      console.log('리스너 및 연결 해제 완료');
    };
  }, []);

  const getCandyAmount = (productId) => {
    switch (productId) {
      case 'com.grsst.myhottalk.candy_30':
        return 30;
      case 'com.grsst.myhottalk.candy_100':
        return 100;
      case 'com.grsst.myhottalk.candy_300':
        return 300;
      case 'com.grsst.myhottalk.candy_500':
        return 500;
      case 'com.grsst.myhottalk.candy_1000':
        return 1000;
      case 'com.grsst.myhottalk.candy_3000':
        return 3000;
      default:
        return 0;
    }
  };

  const handlePurchase = async (productId) => {
    try {
      const token = await EncryptedStorage.getItem('userToken');
        if (!token) {
          Alert.alert("토큰이 만료 되었습니다. 다시 로그인 해주세요.");
          navigation.navigate("LoginScreen"); // 로그인 화면으로 이동
          return;
        }
      //console.log('구매 요청 상품 ID:', productId);
      // requestPurchase 호출 시 단일 productId를 직접 전달
      if(Platform.OS === 'android'){
        await requestPurchase({skus: [productId]});
      }else if(Platform.OS === 'ios'){
        await requestPurchase({sku: productId});
      }
      
    } catch (error) {

      if(error.message === 'Payment is Cancelled.'){
        Alert.alert('결제 오류', '사용자가 결제를 취소했습니다.');
        return;
      }
      if(error.message === 'Billing is unavailable. This may be a problem with your device, or the Play Store may be down.'){
        Alert.alert('결제 오류', 'Play 서비스에 이상이 있습니다.');
        return;
      }
      if(error.message === 'You already own this item.'){
        Alert.alert('결제 오류', '이미 보유한 아이템입니다.');
        return;
      }
      if(error.message === 'Google is indicating that we have some issue connecting to payment.'){
        Alert.alert('결제 오류', '결제가 진행중입니다.');
        return;
      }
      if(error.message === '작업을 완료할 수 없습니다.(SKErrorDomain 오류 2.)'){
        Alert.alert('결제 오류', '사용자가 결제를 취소했습니다.');
        return;
      }
      console.error('결제 요청 오류:', error);
      
      Alert.alert('결제 오류', error.message);

    }
  };


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











  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productContainer}
      onPress={() => handlePurchase(item.productId)}
    >
      <Image source={require('../assets/images/candy.png')} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{Platform.OS === 'android' ? item.name : item.title} {/* iOS와 Android 분리 */}</Text>
      </View>
      <Text style={styles.productPrice}>{item.localizedPrice}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.candyContainer}>
        <Text style={styles.candyText}>보유 캔디: {candyCount}개</Text>
      </View>
      <Text style={styles.title}>캔디 구매</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.productId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555555',
  },
  candyContainer: {
    marginBottom: 10,
  },
  candyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
  },
  title: {
    fontSize: 23,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 10,
    color: '#333333',
  },
  list: {
    paddingBottom: 20,
  },
  productContainer: {
    width: width - 32,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 12,
  },
  productImage: {
    width: 30,
    height: 30,
    marginRight: 12,
    resizeMode: 'contain',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '400',
    color: '#D64949',
  },
});
