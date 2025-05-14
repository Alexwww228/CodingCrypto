let aesKey;

// Функция для генерации ключа AES (256 бит)
async function generateAESKey() {
    // Инициализация глобальной статистики
    window.aesStats = {
        timeStart: 0,
        timeEnd: 0,
        memoryUsed: 0,
        operations: 0
    };
    
    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    // Генерация криптографически безопасного ключа AES-256
    aesKey = await window.crypto.subtle.generateKey(
        { name: "AES-CBC", length: 256 }, // AES-CBC с длиной ключа 256 бит
        true, // Ключ доступен для экспорта
        ["encrypt", "decrypt"] // Операции, которые можно выполнять с ключом
    );

    // Экспорт ключа в формате Base64 для отображения
    const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

    stats.timeEnd = performance.now();
    stats.memoryUsed = exportedKey.byteLength; // Размер ключа в байтах
    stats.operations += 1; // Одна операция генерации ключа

    document.getElementById("keyAES").innerHTML = `
        <h3>Сгенерированный ключ:</h3>
        <p>${keyBase64}</p>
    `;

    // Выводим статистику генерации ключа
    document.getElementById("aesStats").innerHTML = `
        <h4>Статистика генерации ключа:</h4>
        <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
        <p>Память: ${stats.memoryUsed} байт</p>
        <p>Операции: ${stats.operations}</p>
    `;
    
    // Экспортируем статистику для сравнения алгоритмов
    window.aesStats = {
        timeStart: stats.timeStart,
        timeEnd: stats.timeEnd,
        memoryUsed: stats.memoryUsed,
        operations: stats.operations
    };
}

// Функция для шифрования файла с использованием AES-CBC
async function encryptAES() {
    const fileInput = document.getElementById("fileToEncryptAES");
    const file = fileInput.files[0];
    if (!file) {
        alert("Выберите файл для шифрования.");
        return;
    }

    if (!aesKey) {
        alert("Сначала сгенерируйте ключ!");
        return;
    }

    console.log("Starting encryption...");

    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        console.log("File read successfully, starting encryption...");

        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        const encryptedData = await window.crypto.subtle.encrypt(
            { name: "AES-CBC", iv },
            aesKey,
            data
        );

        console.log("Encryption successful, preparing download...");

        const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
        combinedData.set(iv, 0);
        combinedData.set(new Uint8Array(encryptedData), iv.length);

        stats.timeEnd = performance.now();
        stats.memoryUsed = combinedData.byteLength;
        stats.operations += 1;

        const encryptedBlob = new Blob([combinedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(encryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "enAES_" + file.name;
        link.click();
        URL.revokeObjectURL(url);

        document.getElementById("aesStats").innerHTML = `
            <h4>Статистика шифрования:</h4>
            <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${stats.memoryUsed} байт</p>
            <p>Операции: ${stats.operations}</p>
        `;
        
        // Экспортируем статистику для сравнения алгоритмов
        window.aesStats = {
            timeStart: stats.timeStart,
            timeEnd: stats.timeEnd,
            memoryUsed: stats.memoryUsed,
            operations: stats.operations
        };
    } catch (error) {
        console.error("Ошибка при шифровании файла:", error);
        alert("Ошибка при шифровании файла: " + error.message);
    }
}

// Функция для расшифровки файла с использованием AES-CBC
async function decryptAES() {
    const fileInput = document.getElementById("fileToDecryptAES");
    const file = fileInput.files[0];
    if (!file) {
        alert("Выберите файл для расшифровки.");
        return;
    }

    if (!aesKey) {
        alert("Сначала сгенерируйте ключ!");
        return;
    }

    console.log("Starting decryption...");

    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const combinedData = new Uint8Array(arrayBuffer);

        console.log("File read successfully, starting decryption...");

        if (combinedData.length <= 16) {
            throw new Error("Файл слишком маленький или поврежден.");
        }

        const iv = combinedData.slice(0, 16);
        const encryptedData = combinedData.slice(16);

        const decryptedData = await window.crypto.subtle.decrypt(
            { name: "AES-CBC", iv },
            aesKey,
            encryptedData
        );

        console.log("Decryption successful, preparing download...");

        stats.timeEnd = performance.now();
        stats.memoryUsed = decryptedData.byteLength;
        stats.operations += 1;

        const decryptedBlob = new Blob([decryptedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(decryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "deAES_" + file.name;
        link.click();
        URL.revokeObjectURL(url);

        document.getElementById("aesStats").innerHTML = `
            <h4>Статистика расшифровки:</h4>
            <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${stats.memoryUsed} байт</p>
            <p>Операции: ${stats.operations}</p>
        `;
        
        // Экспортируем статистику для сравнения алгоритмов
        window.aesStats = {
            timeStart: stats.timeStart,
            timeEnd: stats.timeEnd,
            memoryUsed: stats.memoryUsed,
            operations: stats.operations
        };
    } catch (error) {
        console.error("Ошибка при расшифровке файла:", error);
        alert("Ошибка при расшифровке файла: " + error.message);
    }
}