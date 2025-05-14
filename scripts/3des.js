let desKey = null;

// Функция для генерации ключа (256 бит)
async function generate3DESKey() {
    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    try {
        // Генерируем 256 бит (32 байта) случайных данных для ключа
        const keyData = crypto.getRandomValues(new Uint8Array(32));
        
        // Импортируем ключ как AES-CBC
        desKey = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "AES-CBC" },
            true,
            ["encrypt", "decrypt"]
        );

        // Конвертируем ключ в Base64 для отображения
        const keyBase64 = btoa(String.fromCharCode(...keyData));

        stats.timeEnd = performance.now();
        stats.memoryUsed = keyData.byteLength;
        stats.operations = 1;

        document.getElementById("key3DES").innerHTML = `
            <h3>Сгенерированный ключ (256 бит):</h3>
            <p>${keyBase64}</p>
        `;

        document.getElementById("3desStats").innerHTML = `
            <h4>Статистика генерации ключа:</h4>
            <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${stats.memoryUsed} байт</p>
            <p>Операции: ${stats.operations}</p>
        `;

        // Экспортируем статистику для сравнения алгоритмов
        window.tripleDesStats = {
            timeStart: stats.timeStart,
            timeEnd: stats.timeEnd,
            memoryUsed: stats.memoryUsed,
            operations: stats.operations
        };
    } catch (error) {
        console.error("Ошибка генерации ключа:", error);
        alert("Ошибка генерации ключа. Проверьте консоль для деталей.");
    }
}

// Функция для шифрования файла
async function encrypt3DES() {
    const fileInput = document.getElementById("fileToEncrypt3DES");
    const file = fileInput.files[0];
    if (!file) {
        alert("Выберите файл для шифрования.");
        return;
    }

    if (!desKey) {
        alert("Сначала сгенерируйте ключ!");
        return;
    }

    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Генерация вектора инициализации
        const iv = crypto.getRandomValues(new Uint8Array(16));

        // Шифрование данных
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            desKey,
            data
        );

        // Комбинируем IV и зашифрованные данные
        const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
        combinedData.set(iv, 0);
        combinedData.set(new Uint8Array(encryptedData), iv.length);

        stats.timeEnd = performance.now();
        stats.memoryUsed = combinedData.byteLength;
        stats.operations = Math.ceil(data.length / 16); // Количество блоков

        // Создаем Blob для скачивания
        const encryptedBlob = new Blob([combinedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(encryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "encrypted_" + file.name;
        link.click();
        URL.revokeObjectURL(url);

        document.getElementById("3desStats").innerHTML = `
            <h4>Статистика шифрования:</h4>
            <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${stats.memoryUsed} байт</p>
            <p>Операции: ${stats.operations}</p>
        `;

        // Экспортируем статистику для сравнения алгоритмов
        window.tripleDesStats = {
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

// Функция для расшифровки файла
async function decrypt3DES() {
    const fileInput = document.getElementById("fileToDecrypt3DES");
    const file = fileInput.files[0];
    if (!file) {
        alert("Выберите файл для расшифровки.");
        return;
    }

    if (!desKey) {
        alert("Сначала сгенерируйте ключ!");
        return;
    }

    const stats = {
        timeStart: performance.now(),
        memoryUsed: 0,
        operations: 0
    };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const combinedData = new Uint8Array(arrayBuffer);

        // Извлекаем IV и зашифрованные данные
        const iv = combinedData.slice(0, 16);
        const encryptedData = combinedData.slice(16);

        // Расшифровываем данные
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: iv
            },
            desKey,
            encryptedData
        );

        stats.timeEnd = performance.now();
        stats.memoryUsed = decryptedData.byteLength;
        stats.operations = Math.ceil(encryptedData.length / 16); // Количество блоков

        // Создаем Blob для скачивания
        const decryptedBlob = new Blob([decryptedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(decryptedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "decrypted_" + file.name;
        link.click();
        URL.revokeObjectURL(url);

        document.getElementById("3desStats").innerHTML = `
            <h4>Статистика расшифровки:</h4>
            <p>Время: ${(stats.timeEnd - stats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${stats.memoryUsed} байт</p>
            <p>Операции: ${stats.operations}</p>
        `;

        // Экспортируем статистику для сравнения алгоритмов
        window.tripleDesStats = {
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
