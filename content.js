// content.js - Güncellenmiş Sürüm

function handleMessage(request, sender, sendResponse) {
    // 1. Mevcut İlleri İsteme Mesajı
    if (request.action === "requestInitialCities") {
        const form = document.getElementById('searchResultsSearchForm');
        let initialCities = [];
        
        if (form) {
            // name="address_city" olan tüm mevcut inputları bul
            const existingInputs = form.querySelectorAll('input[name="address_city"]');
            
            // Değerlerini topla
            initialCities = Array.from(existingInputs).map(input => input.value);
            console.log('[Content Script] Mevcut form verileri popup için hazırlanıyor:', initialCities);
        } else {
            console.log('[Content Script] Hedef form bulunamadı, boş liste gönderiliyor.');
        }

        // Topladığımız veriyi popup'a geri gönder
        sendResponse({ initialCities: initialCities });
        
        // ÖNEMLİ: Asenkron işlemlerde Chrome/Firefox'ta true döndürülmelidir.
        return true; 
    } 
    
    // 2. Form Gönderme Mesajı (Önceki Adımdan gelen kod)
    else if (request.action === "submitSearchForm") {
        // ... (Önceki adımda form gönderme için yazdığınız tüm kod buraya gelecek)
        
        var form = document.getElementById('searchResultsSearchForm');
        
        if (!form) {
            console.error('[Content Script] HATA: "searchResultsSearchForm" ID\'li form elementi ana sayfada bulunamadı.');
            return;
        }

        const cityCodes = request.cityCodes || [];
        console.log(`[Content Script] Popup'tan gelen ${cityCodes.length} adet il kodu işleniyor.`);
        
        // Önceki form gönderimlerinden kalmış olabilecek eski il filtrelerini temizle
        form.querySelectorAll('input[name="address_city"]').forEach(input => input.remove());

        // Gelen her il kodu için forma yeni gizli inputları ekle
        cityCodes.forEach(ilKodu => {
            var cityInput = document.createElement('input');
            cityInput.type = 'hidden';
            cityInput.name = 'address_city';
            cityInput.value = ilKodu;
            
            form.appendChild(cityInput);
            // console.log(`[Content Script] Forma eklendi: address_city=${ilKodu}`); // Loglama çok olabilir
        });

        // Formu gönder
        form.submit();
        // console.log('[Content Script] searchResultsSearchForm formu gönderildi.');
    }
}


if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener(handleMessage);
} else if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.addListener(handleMessage);
}