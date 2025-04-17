// Глобальные переменные для хранения ключей
let publicKey, privateKey;

// Функция для генерации пары ключей ECC
async function generateECCKeys() {
    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    try {
        // Генерация ключей с помощью Web Crypto API
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256"
            },
            true,
            ["deriveKey", "deriveBits"]
        );

        publicKey = keyPair.publicKey;
        privateKey = keyPair.privateKey;

        stats.timeEnd = performance.now();
        stats.memoryUsed = JSON.stringify(keyPair).length;

        document.getElementById("keyECC").innerHTML = `
            <h3>Публичный ключ:</h3>
            <div style="background-color: #333; color: #4cbbff; padding: 10px; border-radius: 6px; font-family: monospace; word-break: break-all; white-space: normal; overflow: visible; border-left: 3px solid #2962ff; margin-bottom: 15px;">${await exportKey(publicKey, "spki")}</div>
            <h3>Приватный ключ:</h3>
            <div style="background-color: #333; color: #4cbbff; padding: 10px; border-radius: 6px; font-family: monospace; word-break: break-all; white-space: normal; overflow: visible; border-left: 3px solid #2962ff;">${await exportKey(privateKey, "pkcs8")}</div>
        `;

        document.getElementById("eccStats").innerHTML = `
            <h4>Статистика генерации ключей:</h4>
            <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${stats.memoryUsed} байт</p>
            <p>Операции: ${stats.operations}</p>
        `;
    } catch (error) {
        console.error("Ошибка генерации ключей ECC:", error);
        alert("Ошибка генерации ключей ECC. Проверьте консоль для деталей.");
    }
}

async function exportKey(key, format) {
    try {
        const exported = await window.crypto.subtle.exportKey(format, key);
        const exportedAsString = String.fromCharCode(...new Uint8Array(exported));
        const exportedAsBase64 = window.btoa(exportedAsString);
        return exportedAsBase64;
    } catch (error) {
        console.error("Ошибка экспорта ключа:", error);
        alert("Ошибка экспорта ключа. Проверьте консоль для деталей.");
    }
}

// Шифрование файла с использованием ECC и AES
async function encryptECC() {
    const file = document.getElementById("fileToEncryptECC").files[0];
    if (!file) {
        alert("Выберите файл для шифрования.");
        return;
    }

    if (!publicKey) {
        alert("Сначала сгенерируйте ключи!");
        return;
    }

    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const data = new Uint8Array(event.target.result); // Содержимое файла в виде Uint8Array

            // Генерация симметричного ключа AES
            const aesKey = await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );

            const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Вектор инициализации

            // Шифрование данных с использованием AES
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                aesKey,
                data
            );

            // Экспорт симметричного ключа
            const aesKeyData = await window.crypto.subtle.exportKey("raw", aesKey);

            // Создаем Blob для скачивания зашифрованного файла
            const combinedData = new Uint8Array(iv.byteLength + aesKeyData.byteLength + encryptedData.byteLength);
            combinedData.set(iv, 0);
            combinedData.set(new Uint8Array(aesKeyData), iv.byteLength);
            combinedData.set(new Uint8Array(encryptedData), iv.byteLength + aesKeyData.byteLength);

            const encryptedBlob = new Blob([combinedData], { type: "application/octet-stream" });
            stats.memoryUsed = encryptedBlob.size;

            const url = URL.createObjectURL(encryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "enECC_" + file.name;
            link.click();
            URL.revokeObjectURL(url);

            stats.timeEnd = performance.now();

            document.getElementById("eccStats").innerHTML = `                <h4>Статистика шифрования:</h4>
                <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
                <p>Память: ${stats.memoryUsed} байт</p>
                <p>Операции: ${stats.operations}</p>
            `;
        } catch (error) {
            console.error("Ошибка шифрования:", error);
            alert("Ошибка шифрования. Проверьте консоль для деталей.");
        }
    };
    reader.onerror = function() {
        alert("Ошибка при чтении файла.");
    };
    reader.readAsArrayBuffer(file);
}

// Расшифровка файла с использованием ECC и AES
async function decryptECC() {
    const file = document.getElementById("fileToDecryptECC").files[0];
    if (!file) {
        alert("Выберите файл для расшифровки.");
        return;
    }

    if (!privateKey) {
        alert("Сначала сгенерируйте ключи!");
        return;
    }

    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const combinedData = new Uint8Array(event.target.result); // Содержимое файла в виде Uint8Array

            // Извлекаем вектор инициализации
            const iv = combinedData.slice(0, 12);

            // Извлекаем зашифрованный симметричный ключ
            const aesKeyData = combinedData.slice(12, 12 + 32);

            // Извлекаем зашифрованные данные
            const encryptedData = combinedData.slice(12 + 32);

            // Импортируем симметричный ключ AES
            const aesKey = await window.crypto.subtle.importKey(
                "raw",
                aesKeyData,
                "AES-GCM",
                true,
                ["decrypt"]
            );

            // Расшифровываем данные с использованием AES
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                aesKey,
                encryptedData
            );

            // Создаем Blob для скачивания расшифрованного файла
            const decryptedBlob = new Blob([decryptedData], { type: "application/octet-stream" });
            stats.memoryUsed = decryptedBlob.size;

            const url = URL.createObjectURL(decryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "deECC_" + file.name;
            link.click();
            URL.revokeObjectURL(url);

            stats.timeEnd = performance.now();

            document.getElementById("eccStats").innerHTML = `
                <h4>Статистика расшифровки:</h4>
                <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
                <p>Память: ${stats.memoryUsed} байт</p>
                <p>Операции: ${stats.operations}</p>
            `;
        } catch (error) {
            console.error("Ошибка расшифровки:", error);
            alert("Ошибка расшифровки. Проверьте консоль для деталей.");
        }
    };
    reader.onerror = function() {
        alert("Ошибка при чтении файла.");
    };
    reader.readAsArrayBuffer(file);
}
