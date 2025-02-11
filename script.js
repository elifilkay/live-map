// script.js
let map;
let searchHistory = [];
let markers = [];
let currentLocationMarker;

// Sayfa yüklendiğinde çalışacak fonksiyon
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    setupEventListeners();
    loadSearchHistoryFromStorage();
});

// Haritayı başlangıç konumuyla başlat
function initializeMap() {
    // İstanbul'u varsayılan konum 
    const defaultLocation = [41.0082, 28.9784];
    map = L.map('map').setView(defaultLocation, 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function setupEventListeners() {
    // Enter tuşu ile arama yapma
    document.getElementById('cityInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadMap();
        }
    });

    // Kullanıcının konumunu alma butonu için listener
    document.getElementById('getCurrentLocation').addEventListener('click', getUserLocation);

    // Clear history butonu için listener
    document.getElementById('clearHistory').addEventListener('click', clearSearchHistory);
}

async function loadMap() {
    const city = document.getElementById('cityInput').value;
    if (!city) {
        showNotification('Please enter a location name', 'error');
        return;
    }

    try {
        const location = await geocodeLocation(city);
        if (location) {
            updateMap(location);
            addToSearchHistory(location.formatted);
        } else {
            showNotification('Location not found', 'error');
        }
    } catch (error) {
        console.error('Error loading map:', error);
        showNotification('An error occurred while loading the map', 'error');
    }
}

// Konum kodlama işlemi
async function geocodeLocation(query) {
    const apiKey = '5bf94d901432411a94683cdedceed4e2';
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return data.results[0];
        }
        return null;
    } catch (error) {
        throw new Error('Geocoding failed');
    }
}

// Haritayı güncelleme
function updateMap(location) {
    const { lat, lng } = location.geometry;
    
    // Mevcut işaretçileri temizle
    clearMarkers();
    
    // Harita görünümünü güncelle
    map.setView([lat, lng], 12);
    
    // Yeni işaretçi ekleme
    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>${location.formatted}</b>`)
        .openPopup();
    
    markers.push(marker);
}

function clearMarkers() {
    markers.forEach(marker => marker.remove());
    markers = [];
}

// Diğer kodlar aynı kalacak, sadece getUserLocation fonksiyonunu güncelliyoruz
async function getUserLocation() {
    // Önce tarayıcı desteğini kontrol et
    if (!navigator.geolocation) {
        showNotification('Tarayıcınız konum özelliğini desteklemiyor', 'error');
        return;
    }

    try {
        // Kullanıcıya konum izni isteği göster
        showNotification('Konum izni bekleniyor...', 'info');

        const position = await new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,  // Yüksek hassasiyet
                timeout: 10000,            // 10 saniye zaman aşımı
                maximumAge: 0              // Her zaman güncel konum
            };

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(pos),
                (err) => {
                    switch(err.code) {
                        case err.PERMISSION_DENIED:
                            reject(new Error('Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini etkinleştirin.'));
                            break;
                        case err.POSITION_UNAVAILABLE:
                            reject(new Error('Konum bilgisi alınamıyor. Lütfen konum servislerinizin açık olduğundan emin olun.'));
                            break;
                        case err.TIMEOUT:
                            reject(new Error('Konum isteği zaman aşımına uğradı. Lütfen tekrar deneyin.'));
                            break;
                        default:
                            reject(new Error('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'));
                    }
                },
                options
            );
        });

        const { latitude, longitude } = position.coords;
        
        // Mevcut konum işaretçisini temizle
        if (currentLocationMarker) {
            currentLocationMarker.remove();
        }
        
        // Haritayı konuma taşı ve yakınlaştır
        map.setView([latitude, longitude], 13);

        // Özel bir işaretçi ikonu oluştur
        const locationIcon = L.divIcon({
            html: `<div style="
                width: 20px;
                height: 20px;
                background: #4285f4;
                border: 3px solid #fff;
                border-radius: 50%;
                box-shadow: 0 0 5px rgba(0,0,0,0.3);
            "></div>`,
            className: 'custom-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Yeni konum işaretçisi ekle
        currentLocationMarker = L.marker([latitude, longitude], {
            icon: locationIcon,
            title: 'Konumunuz'
        })
            .addTo(map)
            .bindPopup('Şu anki konumunuz')
            .openPopup();

        // Konumu göster ve başarı mesajı ver
        showNotification('Konumunuz başarıyla bulundu!', 'success');

        // Konum bilgilerini göster (opsiyonel olarak adres bilgisi de eklenebilir)
        const locationInfo = `
            Enlem: ${latitude.toFixed(6)}
            Boylam: ${longitude.toFixed(6)}
        `;
        console.log(locationInfo);

        // İsterseniz reverse geocoding ile adres bilgisini de alabilirsiniz
        try {
            const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=5bf94d901432411a94683cdedceed4e2`);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const address = data.results[0].formatted;
                currentLocationMarker.setPopupContent(`Konumunuz: ${address}`);
            }
        } catch (error) {
            console.error('Adres bilgisi alınamadı:', error);
        }

    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Konum alma hatası:', error);
    }
}

// Arama geçmişini yerel depolamaya kaydet
function saveSearchHistoryToStorage() {
    localStorage.setItem('mapSearchHistory', JSON.stringify(searchHistory));
}

// Arama geçmişini yerel depolamadan yükle
function loadSearchHistoryFromStorage() {
    const savedHistory = localStorage.getItem('mapSearchHistory');
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
        updateSearchHistoryUI();
    }
}

// Arama geçmişini temizle
function clearSearchHistory() {
    searchHistory = [];
    localStorage.removeItem('mapSearchHistory');
    updateSearchHistoryUI();
    showNotification('Search history cleared', 'success');
}

// Arama geçmişini ekle
function addToSearchHistory(location) {
    if (!searchHistory.includes(location)) {
        searchHistory.unshift(location); // Yeni konumu başa ekleme
        if (searchHistory.length > 10) { // Maksimum 10 kayıt tutma
            searchHistory.pop();
        }
        saveSearchHistoryToStorage();
        updateSearchHistoryUI();
    }
}

function updateSearchHistoryUI() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    searchHistory.forEach(location => {
        const listItem = document.createElement('li');
        listItem.className = 'history-item';
        listItem.textContent = location;
        listItem.onclick = () => {
            document.getElementById('cityInput').value = location;
            loadMap();
        };
        historyList.appendChild(listItem);
    });
}

// Bildirim göster
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}