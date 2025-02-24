// 使用 CryptoJS 进行数据加密和解密
import CryptoJS from 'crypto-js'

// 数据加密
export function encryptData (data) {
  try {
    const jsonStr = JSON.stringify(data)
    return CryptoJS.AES.encrypt(jsonStr, 'vue-idle-xiuxian').toString()
  } catch (error) {
    console.error('数据加密失败:', error)
    return null
  }
}

// 数据解密
export function decryptData (encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, 'vue-idle-xiuxian')
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedStr)
  } catch (error) {
    console.error('数据解密失败:', error)
    return null
  }
}

// 数据校验
export function validateData (data) {
  // 检查必要的数据字段
  const requiredFields = [
    'name',
    'level',
    'realm',
    'cultivation',
    'maxCultivation',
    'spirit',
    'baseAttributes'
  ]

  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`数据验证失败: 缺少必要字段 ${field}`)
      return false
    }
  }

  // 检查数值的合理性
  if (data.level < 1 || data.cultivation < 0 || data.spirit < 0) {
    console.error('数据验证失败: 数值异常')
    return false
  }

  return true
}