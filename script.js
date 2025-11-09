// script.js

// DOMContentLoaded: Popup yüklendiğinde çalışacak ana blok
document.addEventListener('DOMContentLoaded', (event) => {

  // 1. Popup açıldığında hemen ana sayfadan mevcut form verilerini iste
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // Mesajı aktif sekmeye gönder: Mevcut illeri bana gönder
      chrome.tabs.sendMessage(tabs[0].id, { action: "requestInitialCities" }, function (response) {
        if (response && response.initialCities) {
          console.log("Ana sayfadan gelen mevcut iller:", response.initialCities);
          // 2. Gelen verilerle haritayı ve popup'taki #formData div'ini güncelle
          updateMapAndFormData(response.initialCities);
        } else {
          console.log("Ana sayfada önceden seçili il verisi bulunamadı.");
        }
      });
    });
  }
  // ... (Firefox/browser.tabs kısmı da benzer şekilde güncellenmeli)

  // Arama butonuna tıklama işlevi (Önceki adımda yaptığımız değişiklikler yerinde kalmalı)
  const searchButton = document.getElementById('searchButton');
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      // 1. Popup penceresindeki #formData div'inden seçili il kodlarını topla
      const formDataDiv = document.getElementById('formData');
      const cityInputs = formDataDiv.querySelectorAll('input[name="address_city"]');

      // Gizli inputların 'value' değerlerini (il kodlarını) bir diziye dönüştür
      const selectedCityCodes = Array.from(cityInputs).map(input => input.value);

      console.log("Popup'tan ana sayfaya gönderilecek seçili iller:", selectedCityCodes);

      // 2. Mesajı, toplanan il kodlarını içeren bir yük (payload) ile gönder
      const messagePayload = {
        action: "submitSearchForm",
        cityCodes: selectedCityCodes // Kritik veri
      };

      // Tarayıcı API'leri ile aktif sekmeye mesaj gönder
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, messagePayload);
        });
      }
      else if (typeof browser !== 'undefined' && browser.tabs) {
        browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
          browser.tabs.sendMessage(tabs[0].id, messagePayload);
        });
      }
    });
  }

  // Harita fonksiyonunu çağır (Bu kısım zaten vardır)
  svgturkiyeharitasi();
});


// YENİ FONKSİYON: Haritayı ve gizli inputları başlangıç verisine göre günceller
function updateMapAndFormData(cityCodes) {
  const element = document.querySelector('#svg-turkiye-haritasi');
  const formDataDiv = document.getElementById('formData');

  if (!element || !formDataDiv) {
    console.error("Harita veya formDataDiv bulunamadı, güncelleme yapılamıyor.");
    return;
  }

  // 1. Önce harita üzerindeki tüm illeri sıfırla (gerekliyse)
  element.querySelectorAll('g.selected').forEach(g => g.classList.remove('selected'));
  // 2. formDataDiv'deki tüm gizli inputları temizle
  formDataDiv.innerHTML = '';

  // 3. Gelen her il kodu için harita elementini ve formDataDiv'i güncelle
  cityCodes.forEach(ilKodu => {
    // İlgili ilin <g> elementini data-plakakodu niteliği ile bul
    const group = element.querySelector(`g[data-plakakodu="${ilKodu}"]`);

    if (group) {
      // Harita üzerinde ili "seçili" yap
      group.classList.add('selected');

      // Gizli input elementini oluştur ve formDataDiv'e ekle
      var cityInput = document.createElement('input');
      cityInput.type = 'hidden';
      cityInput.name = 'address_city';
      cityInput.value = ilKodu;
      cityInput.className = 'formData';
      cityInput.id = `cityInput_${ilKodu}`; // Kaldırma için gerekli ID

      formDataDiv.appendChild(cityInput);
      console.log(`[SENKRONİZE] ${group.getAttribute('data-iladi')} (${ilKodu}) haritaya ve div'e eklendi.`);
    }
  });
}

// svgturkiyeharitasi() fonksiyonunuz burada devam ediyor...
function svgturkiyeharitasi() {
  const element = document.querySelector('#svg-turkiye-haritasi');

  // Seçili illerin inputlarını yönetecek DIV elementi kontrolü (Diğer konuya ait)
  const formDataDiv = document.getElementById('formData');
  // ...

  // --- YENİ EKLENEN KISIM (İsimleri haritaya eklemek için) ---
  const svgNS = "http://www.w3.org/2000/svg";
  const cityGroups = element.querySelectorAll('g[data-iladi]');

  cityGroups.forEach(group => {
    const cityName = group.getAttribute('data-iladi');

    let bbox;
    try {
      // **KRİTİK NOKTA A:** getBBox() fonksiyonu gizli elementlerde hata verebilir.
      bbox = group.getBBox();
    } catch (e) {
      console.error("BBox alınamadı:", group.id, e);
      return; // Bu il için işlemi durdur
    }

    // Şehrin merkez koordinatlarını hesapla
    const x = bbox.x + bbox.width / 2;
    const y = bbox.y + bbox.height / 2;

    // Yeni bir SVG <text> elementi oluştur
    const textElement = document.createElementNS(svgNS, 'text');
    textElement.setAttribute('x', x);
    textElement.setAttribute('y', y);

    // YENİ EKLEME: SVG yazıların harita üzerine doğru oturması için transform ayarı ekleyelim.
    // Özellikle tarayıcı uyumluluğu için faydalı olabilir.
    // textElement.setAttribute('transform', 'translate(' + x + ',' + y + ')'); // Eğer x,y 0,0 ise bu kullanılır

    textElement.textContent = cityName;

    // Oluşturulan text elementini ilgili şehrin grubuna (<g>) ekle
    group.appendChild(textElement); // **KRİTİK NOKTA B: Text elementi gruba ekleniyor mu?**
  });

  // Tıklama özelliğini çoklu seçim (toggle) olarak güncelliyoruz
  element.addEventListener(
    'click',
    function (event) {
      // Tıklamanın <path> (il sınırı) veya <text> (il adı) üzerinde olup olmadığını kontrol et
      if (event.target.tagName === 'path' || event.target.tagName === 'text') {

        // Tıklanan elementin ait olduğu ilin <g> grubunu bul
        const group = event.target.closest('g[data-iladi]');

        if (group) {
          const ilAdi = group.getAttribute('data-iladi');
          // NOT: Plaka kodunu data-plakakodu niteliğinden alıyoruz
          const ilKodu = group.getAttribute('data-plakakodu');

          // 'selected' sınıfının olup olmadığını kontrol et ve tersine çevir (toggle)
          group.classList.toggle('selected');

          // **********************************************
          // ** YENİ EKLEME/KALDIRMA MANTIĞI BAŞLANGIÇ **
          // **********************************************

          if (formDataDiv && ilKodu) {
            const inputId = `cityInput_${ilKodu}`; // Benzersiz bir ID tanımlayalım

            if (group.classList.contains('selected')) {
              // Ekleme işlemi (Il yeni seçildi)
              console.log(`[VERİ EKLEME] ${ilAdi} (${ilKodu}) seçildi.`);

              var cityInput = document.createElement('input');
              cityInput.type = 'hidden';
              cityInput.name = 'address_city'; // İstenen name alanı
              cityInput.value = ilKodu;
              cityInput.className = 'formData';
              cityInput.id = inputId; // Kaldırmak için ID tanımla

              formDataDiv.appendChild(cityInput);
            } else {
              // Kaldırma işlemi (Il seçimi kaldırıldı)
              console.log(`[VERİ KALDIRMA] ${ilAdi} (${ilKodu}) seçimi kaldırıldı.`);

              const existingInput = document.getElementById(inputId);
              if (existingInput) {
                existingInput.remove(); // Input elementini DOM'dan kaldır
              }
            }
          }

          // **********************************************
          // ** YENİ EKLEME/KALDIRMA MANTIĞI SON **
          // **********************************************

          // İsteğe bağlı: Hangi illerin seçili olduğunu konsola yazdır (Mevcut kodunuz)
          if (group.classList.contains('selected')) {
            // console.log(ilAdi + ' seçildi.'); // Zaten yukarıda loglanıyor
          } else {
            // console.log(ilAdi + ' seçimi kaldırıldı.'); // Zaten yukarıda loglanıyor
          }
        }
      }
    },
    false
  );

}

