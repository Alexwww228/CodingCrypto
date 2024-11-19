let aesKey;

// Простая функция для генерации случайного ключа (256 бит)
function generateAESKey() {
    aesKey = new Uint8Array(32); // Создаем массив для 32 байтов (256 бит)
    window.crypto.getRandomValues(aesKey); // Заполняем его случайными значениями

    // Конвертируем ключ в строку Base64 для отображения
    const keyBase64 = btoa(String.fromCharCode(...aesKey));
    document.getElementById("keyAES").innerHTML = `
    <h3>Сгенерированный ключ:</h3>
    <p>${keyBase64}</p>
`;
}

// Простая реализация XOR-шифрования (НЕ безопасно для реальной криптографии)
function xorEncrypt(data, key) {
    const output = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        output[i] = data[i] ^ key[i % key.length]; // XOR каждого байта с ключом
    }
    return output;
}

// Функция для шифрования файла
async function encryptAES() {
    const file = document.getElementById("fileToEncryptAES").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const data = new Uint8Array(event.target.result);

            // Шифруем данные с использованием XOR (для демонстрации)
            const encryptedData = xorEncrypt(data, aesKey);

            // Сохраняем зашифрованные данные в файл
            const encryptedBlob = new Blob([encryptedData], { type: "application/octet-stream" });
            const url = URL.createObjectURL(encryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "enAES_" + file.name;
            link.click();
        };
        reader.readAsArrayBuffer(file);
    }
}

// Функция для расшифровки файла
async function decryptAES() {
    const file = document.getElementById("fileToDecryptAES").files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const encryptedData = new Uint8Array(event.target.result);

            // Расшифровываем данные с использованием XOR (тот же процесс, что и шифрование)
            const decryptedData = xorEncrypt(encryptedData, aesKey);

            // Создаем Blob для скачивания расшифрованных данных
            const decryptedBlob = new Blob([decryptedData], { type: "application/octet-stream" });
            const url = URL.createObjectURL(decryptedBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "deAES_" + file.name;
            link.click();
        };
        reader.readAsArrayBuffer(file);
    }
}
