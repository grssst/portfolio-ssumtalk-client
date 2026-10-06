// fuseInstance.js
import Fuse from 'fuse.js';
import locations from '../assets/locations.json';

// 각 항목에 fullAddress 필드 추가 (시군구명과 읍면동명을 결합)
const processedLocations = locations.map(item => ({
  ...item,
  fullAddress: `${item.시군구명} ${item.읍면동명}`
}));

const fuseOptions = {
  // fullAddress 키만 지정하면 전체 주소로 검색됨
  keys: ['fullAddress'],
  threshold: 0.3,
};

const fuseInstance = new Fuse(processedLocations, fuseOptions);

export default fuseInstance;
