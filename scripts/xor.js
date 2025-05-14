let xorKey = null;

window.xorStats = {
    steps: 0,
    timeStart: 0,
    timeEnd: 0,
    memoryUsed: 0,
    operations: {
        bitwise: 0
    }
};

function resetXORStats() {
    window.xorStats = {
        steps: 0,
        timeStart: 0,
        timeEnd: 0,
        memoryUsed: 0,
        operations: {
            bitwise: 0
        }
    };
}

function generateXORKey(length) {
    resetXORStats();
    window.xorStats.timeStart = performance.now();
    
    const key = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        key[i] = Math.floor(Math.random() * 256);
        window.xorStats.steps++;
        window.xorStats.operations.bitwise++;
    }
    
    const keyHex = Array.from(key).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
    
    window.xorStats.timeEnd = performance.now();
    window.xorStats.memoryUsed = key.byteLength;
    
    document.getElementById("keyXOR").innerHTML = `
        <h3>Сгенерированный ключ:</h3>
        <p>${keyHex}</p>
    `;
    
    document.getElementById("xorStats").innerHTML = `
        <h4>Статистика генерации ключа:</h4>
        <p>Время: ${(window.xorStats.timeEnd - window.xorStats.timeStart).toFixed(2)}ms</p>
        <p>Память: ${window.xorStats.memoryUsed} байт</p>
        <p>Операции: ${window.xorStats.steps}</p>
    `;
    
    saveKey(key);
    xorKey = key;
    return key;
}

function saveKey(key) {
    const keyHex = Array.from(key).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
    localStorage.setItem("xorKey", keyHex);
}

function loadKey() {
    const keyHex = localStorage.getItem("xorKey");
    if (!keyHex) return null;
    return new Uint8Array(keyHex.split(' ').map(byte => parseInt(byte, 16)));
}

function xorEncryptDecrypt(data, key) {
    const result = new Uint8Array(data.length);
    
    window.xorStats.steps++;
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ key[i % key.length];
        window.xorStats.operations.bitwise++;
        
        if (i % 1000 === 0) window.xorStats.steps++;
    }
    
    return result;
}

async function encryptXOR() {
    resetXORStats();
    window.xorStats.timeStart = performance.now();
    
    const fileInput = document.getElementById("fileToEncryptXOR");
    const file = fileInput.files[0];
    if (!file) {
        alert("Пожалуйста, выберите файл для шифрования.");
        return;
    }

    const keyLength = parseInt(document.getElementById("length").value);
    if (isNaN(keyLength) || keyLength <= 0) {
        alert("Пожалуйста, введите корректную длину ключа.");
        return;
    }

    if (!xorKey || xorKey.length !== keyLength) {
        generateXORKey(keyLength);
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        window.xorStats.steps++;

        const encryptedData = xorEncryptDecrypt(data, xorKey);
        window.xorStats.memoryUsed = encryptedData.byteLength;
        window.xorStats.steps++;

        const encryptedBlob = new Blob([encryptedData], { type: "application/octet-stream" });
        const url = URL.createObjectURL(encryptedBlob);

        window.xorStats.timeEnd = performance.now();
        
        document.getElementById("xorStats").innerHTML = `
            <h4>Статистика шифрования:</h4>
            <p>Время: ${(window.xorStats.timeEnd - window.xorStats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${window.xorStats.memoryUsed} байт</p>
            <p>Количество операций: ${window.xorStats.operations.bitwise}</p>
            <p>Количество шагов: ${window.xorStats.steps}</p>
            <p>Размер исходных данных: ${data.length} байт</p>
            <p>Размер зашифрованных данных: ${encryptedData.length} байт</p>
            <p>Скорость: ${Math.round(data.length / ((window.xorStats.timeEnd - window.xorStats.timeStart) / 1000) / 1024)} КБ/сек</p>
        `;

        const link = document.createElement("a");
        link.href = url;
        link.download = "enXOR_" + file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert("Ошибка при шифровании файла: " + error.message);
    }
}

async function decryptXOR() {
    resetXORStats();
    window.xorStats.timeStart = performance.now();
    
    const fileInput = document.getElementById("fileToDecryptXOR");
    const file = fileInput.files[0];
    if (!file) {
        alert("Пожалуйста, выберите файл для расшифровки.");
        return;
    }

    xorKey = loadKey();
    if (!xorKey) {
        alert("Ключ не найден. Сначала сгенерируйте ключ.");
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const encryptedData = new Uint8Array(arrayBuffer);
        window.xorStats.steps++;

        const decryptedData = xorEncryptDecrypt(encryptedData, xorKey);
        window.xorStats.memoryUsed = decryptedData.byteLength;
        window.xorStats.steps++;

        window.xorStats.timeEnd = performance.now();
        
        document.getElementById("xorStats").innerHTML = `
            <h4>Статистика расшифровки:</h4>
            <p>Время: ${(window.xorStats.timeEnd - window.xorStats.timeStart).toFixed(2)}ms</p>
            <p>Память: ${window.xorStats.memoryUsed} байт</p>
            <p>Количество операций: ${window.xorStats.operations.bitwise}</p>
            <p>Количество шагов: ${window.xorStats.steps}</p>
            <p>Размер зашифрованных данных: ${encryptedData.length} байт</p>
            <p>Размер расшифрованных данных: ${decryptedData.length} байт</p>
            <p>Скорость: ${Math.round(decryptedData.length / ((window.xorStats.timeEnd - window.xorStats.timeStart) / 1000) / 1024)} КБ/сек</p>
        `;

        const decryptedBlob = new Blob([decryptedData], { type: file.type || "application/octet-stream" });
        const url = URL.createObjectURL(decryptedBlob);

        const link = document.createElement("a");
        link.href = url;
        link.download = file.name.startsWith("enXOR_") ? file.name.substring(6) : "decrypted_" + file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert("Ошибка при расшифровке файла: " + error.message);
    }
}