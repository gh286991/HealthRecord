const { MongoClient } = require('mongodb');

// 資料庫連接配置
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/healthrecord';

async function migrateNutritionFields() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('已連接到 MongoDB');
    
    const db = client.db();
    const collection = db.collection('dietrecords');
    
    // 查找所有記錄
    const records = await collection.find({}).toArray();
    console.log(`找到 ${records.length} 筆記錄需要檢查`);
    
    let updatedCount = 0;
    
    for (const record of records) {
      let needsUpdate = false;
      const updateDoc = {};
      
      // 檢查並更新 foods 陣列中的營養素字段
      if (record.foods && record.foods.length > 0) {
        const updatedFoods = record.foods.map(food => {
          const updatedFood = { ...food };
          
          // 確保所有營養素字段存在
          if (typeof updatedFood.protein === 'undefined') updatedFood.protein = 0;
          if (typeof updatedFood.carbohydrates === 'undefined') updatedFood.carbohydrates = 0;
          if (typeof updatedFood.fat === 'undefined') updatedFood.fat = 0;
          if (typeof updatedFood.fiber === 'undefined') updatedFood.fiber = 0;
          if (typeof updatedFood.sugar === 'undefined') updatedFood.sugar = 0;
          if (typeof updatedFood.sodium === 'undefined') updatedFood.sodium = 0;
          if (typeof updatedFood.calories === 'undefined') updatedFood.calories = 0;
          
          return updatedFood;
        });
        
        // 檢查是否有任何 food 項目被更新
        const foodsChanged = JSON.stringify(record.foods) !== JSON.stringify(updatedFoods);
        if (foodsChanged) {
          updateDoc.foods = updatedFoods;
          needsUpdate = true;
        }
      }
      
      // 檢查並更新總營養素字段
      if (typeof record.totalProtein === 'undefined') {
        updateDoc.totalProtein = 0;
        needsUpdate = true;
      }
      if (typeof record.totalCarbohydrates === 'undefined') {
        updateDoc.totalCarbohydrates = 0;
        needsUpdate = true;
      }
      if (typeof record.totalFat === 'undefined') {
        updateDoc.totalFat = 0;
        needsUpdate = true;
      }
      if (typeof record.totalFiber === 'undefined') {
        updateDoc.totalFiber = 0;
        needsUpdate = true;
      }
      if (typeof record.totalSugar === 'undefined') {
        updateDoc.totalSugar = 0;
        needsUpdate = true;
      }
      if (typeof record.totalSodium === 'undefined') {
        updateDoc.totalSodium = 0;
        needsUpdate = true;
      }
      
      // 如果需要更新，執行更新
      if (needsUpdate) {
        await collection.updateOne(
          { _id: record._id },
          { $set: updateDoc }
        );
        updatedCount++;
        console.log(`已更新記錄 ${record._id}`);
      }
    }
    
    console.log(`遷移完成！總共更新了 ${updatedCount} 筆記錄`);
    
  } catch (error) {
    console.error('遷移過程中發生錯誤:', error);
  } finally {
    await client.close();
    console.log('已關閉 MongoDB 連接');
  }
}

// 執行遷移
if (require.main === module) {
  migrateNutritionFields()
    .then(() => {
      console.log('遷移腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('遷移腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = { migrateNutritionFields };
