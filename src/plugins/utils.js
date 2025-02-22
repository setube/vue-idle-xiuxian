// 将数字格式化为中文单位（显示相邻两个单位）
export const formatNumberToChineseUnit = (number) => {
    number = number > 0 ? Math.floor(number) : 0;
    const units = ['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极'];
    
    // 处理小于1万的数字
    if (number < 10000) {
        return number.toString();
    }
    
    let num = number;
    let unitIndex = 0;
    
    // 找到最大单位
    while (num >= 10000 && unitIndex < units.length - 1) {
        num = Math.floor(num / 10000);
        unitIndex++;
    }
    
    // 获取高位数值
    const highNum = num;
    
    // 获取低位数值（前一个单位的数字）
    const lowNum = Math.floor((number % (10000 ** unitIndex)) / (10000 ** (unitIndex - 1)));
    
    // 如果是万以下的数字，直接返回
    if (unitIndex === 0) {
        return number.toString();
    }
    
    // 如果只有一个单位，只显示一个
    if (unitIndex === 1) {
        return highNum + units[unitIndex];
    }
    
    // 显示两个相邻单位
    return highNum + units[unitIndex] + (lowNum > 0 ? lowNum.toString().padStart(4, '0') + units[unitIndex - 1] : '');
};