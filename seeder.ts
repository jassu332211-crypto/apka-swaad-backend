import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

import { Food }     from '../models/Food'
import { Festival } from '../models/Festival'
import { User }     from '../models/User'
import { logger }   from '../utils/logger'

const FOODS = [
  // Muslim
  { name:'Dum Biryani',    nameHindi:'दम बिरयानी',  shortDescription:'Aromatic slow-cooked rice with tender meat',
    description:'Slow-cooked basmati rice layered with marinated chicken/mutton, saffron, fried onions, and whole spices in a sealed handi.',
    category:'Main Course', religion:'Muslim', festivals:['Eid ul-Fitr','Eid ul-Adha','Muharram'],
    price:180, cost:80, isVeg:false, prepTime:45, spiceLevel:2, isSpicy:true,
    freeItems:[{name:'Raita',quantity:'1 bowl'},{name:'Salad',quantity:'1 plate'}],
    image:'/images/biryani.jpg', tags:['biryani','rice','eid','nonveg'], ingredients:['Basmati Rice','Chicken','Saffron','Fried Onions','Whole Spices'] },

  { name:'Seekh Kebab',    nameHindi:'सीख कबाब',    shortDescription:'Chargrilled minced meat skewers',
    description:'Juicy minced lamb/chicken kebabs grilled on skewers with aromatic spices, mint, and served with green chutney.',
    category:'Starter', religion:'Muslim', festivals:['Eid ul-Fitr','Ramadan'],
    price:160, cost:70, isVeg:false, prepTime:20, spiceLevel:2, isSpicy:true,
    freeItems:[{name:'Roti',quantity:'2 pieces'},{name:'Green Chutney',quantity:'1 portion'}],
    image:'/images/seekh-kebab.jpg', tags:['kebab','starter','eid','nonveg'], ingredients:['Minced Lamb','Green Chilli','Coriander','Garam Masala'] },

  { name:'Sheer Khurma',   nameHindi:'शीर खुरमा',   shortDescription:'Festival vermicelli pudding with dry fruits',
    description:'Creamy milk-based vermicelli dessert loaded with dates, dry fruits, and flavoured with cardamom and rose water. Made on Eid morning.',
    category:'Dessert', religion:'Muslim', festivals:['Eid ul-Fitr'],
    price:90, cost:35, isVeg:true, prepTime:30, spiceLevel:0, isSpicy:false,
    freeItems:[{name:'Dates',quantity:'4 pieces'}],
    image:'/images/sheer-khurma.jpg', tags:['dessert','eid','sweet','veg'], ingredients:['Vermicelli','Full Cream Milk','Dates','Almonds','Cardamom'] },

  // Hindu
  { name:'Modak',          nameHindi:'मोदक',         shortDescription:"Ganesh's favourite steamed sweet dumpling",
    description:'Steamed rice flour dumplings filled with jaggery, coconut, and cardamom. Lord Ganesha\'s favourite — made for Ganesh Chaturthi.',
    category:'Dessert', religion:'Hindu', festivals:['Ganesh Chaturthi','Diwali'],
    price:80, cost:30, isVeg:true, prepTime:40, spiceLevel:0, isSpicy:false,
    freeItems:[{name:'Extra Modak',quantity:'2 pieces'}],
    image:'/images/modak.jpg', tags:['modak','ganesh','sweet','veg'], ingredients:['Rice Flour','Coconut','Jaggery','Cardamom'] },

  { name:'Puran Poli',     nameHindi:'पूरन पोली',   shortDescription:'Sweet flatbread stuffed with lentil filling',
    description:'Traditional Maharashtrian flatbread stuffed with chana dal, jaggery, and spices. Made during Holi and Diwali with ghee.',
    category:'Main Course', religion:'Hindu', festivals:['Holi','Diwali','Gudi Padwa'],
    price:100, cost:40, isVeg:true, prepTime:35, spiceLevel:0, isSpicy:false,
    freeItems:[{name:'Ghee',quantity:'1 portion'},{name:'Aamti Dal',quantity:'1 bowl'}],
    image:'/images/puran-poli.jpg', tags:['holi','diwali','sweet','veg','maharashtrian'], ingredients:['Whole Wheat Flour','Chana Dal','Jaggery','Cardamom','Ghee'] },

  { name:'Kaju Katli',     nameHindi:'काजू कतली',   shortDescription:'Premium cashew fudge — Diwali essential',
    description:'Silky smooth cashew fudge with silver vark, made with pure desi ghee. The quintessential Diwali mithai gifted across India.',
    category:'Dessert', religion:'Hindu', festivals:['Diwali','Navratri','Raksha Bandhan'],
    price:200, cost:90, isVeg:true, prepTime:60, spiceLevel:0, isSpicy:false,
    freeItems:[{name:'Gift Box',quantity:'1'}],
    image:'/images/kaju-katli.jpg', tags:['diwali','mithai','sweet','veg','gift'], ingredients:['Cashews','Sugar','Ghee','Silver Vark'] },

  // Sikh
  { name:'Dal Makhani',    nameHindi:'दाल मखनी',    shortDescription:'Slow-cooked black lentils in buttery tomato gravy',
    description:'Iconic Punjabi dal simmered overnight on slow fire with butter, cream, tomatoes. A staple at Gurudwara langars across India.',
    category:'Main Course', religion:'Sikh', festivals:['Baisakhi','Lohri','Gurpurab'],
    price:110, cost:45, isVeg:true, prepTime:20, spiceLevel:1, isSpicy:false,
    freeItems:[{name:'Butter Naan',quantity:'2 pieces'},{name:'Lassi',quantity:'1 glass'}],
    image:'/images/dal-makhani.jpg', tags:['dal','punjabi','sikh','veg','langar'], ingredients:['Black Lentils','Butter','Cream','Tomatoes','Spices'] },

  { name:'Karah Prasad',   nameHindi:'करह प्रसाद',  shortDescription:'Sacred Gurudwara wheat halwa',
    description:'Holy semolina halwa made with equal parts wheat flour, ghee, and sugar. Blessed in Gurudwara and offered to all regardless of faith.',
    category:'Dessert', religion:'Sikh', festivals:['Baisakhi','Gurpurab','Diwali'],
    price:60, cost:20, isVeg:true, prepTime:20, spiceLevel:0, isSpicy:false,
    freeItems:[{name:'Langar Dal',quantity:'1 bowl'}],
    image:'/images/karah-prasad.jpg', tags:['prasad','sikh','sweet','veg','gurudwara'], ingredients:['Wheat Flour','Ghee','Sugar','Water'] },

  // Christian
  { name:'Goan Pork Vindaloo', nameHindi:'गोअन पोर्क विंडालू', shortDescription:'Fiery Goan pork curry with vinegar',
    description:'Classic Goan-Portuguese curry with pork marinated in spiced vinegar paste. Tangy, hot, and deeply aromatic — Christmas and Easter favourite.',
    category:'Main Course', religion:'Christian', festivals:['Christmas','Easter'],
    price:220, cost:100, isVeg:false, prepTime:50, spiceLevel:3, isSpicy:true,
    freeItems:[{name:'Steamed Rice',quantity:'1 plate'}],
    image:'/images/vindaloo.jpg', tags:['goan','christmas','nonveg','spicy','pork'], ingredients:['Pork','Kashmiri Chilli','Vinegar','Garlic','Spices'] },

  { name:'Bebinca',        nameHindi:'बेबिंका',      shortDescription:'Layered Goan coconut pudding cake',
    description:'Traditional Goan dessert with 7-16 layers of coconut milk, egg yolks, and sugar, each layer individually baked. Christmas is incomplete without it.',
    category:'Dessert', religion:'Christian', festivals:['Christmas','Easter','Goa Liberation Day'],
    price:140, cost:60, isVeg:false, prepTime:90, spiceLevel:0, isSpicy:false,
    freeItems:[{name:'Coffee',quantity:'1 cup'}],
    image:'/images/bebinca.jpg', tags:['goan','christmas','sweet','cake'], ingredients:['Coconut Milk','Eggs','Sugar','Flour','Ghee'] },

  // Jain
  { name:'Jain Thali',     nameHindi:'जैन थाली',    shortDescription:'Pure Jain meal — no onion, no garlic, no roots',
    description:'Complete Jain meal with dal bafla, sabzi, roti, rice, papad, and dessert. Strictly no underground vegetables, onion, or garlic. Made with ahimsa.',
    category:'Thali', religion:'Jain', festivals:['Paryushana','Mahavir Jayanti','Diwali'],
    price:220, cost:90, isVeg:true, prepTime:40, spiceLevel:1, isSpicy:false,
    freeItems:[{name:'Dessert',quantity:'1 portion'},{name:'Papad',quantity:'2 pieces'}],
    image:'/images/jain-thali.jpg', tags:['jain','thali','veg','no-onion','no-garlic'], ingredients:['Toor Dal','Wheat Flour','Rice','Ghee','Jain Spices'] },

  // Buddhist
  { name:'Khichdi Prasad', nameHindi:'खिचड़ी प्रसाद', shortDescription:'Simple wholesome rice and lentil prasad',
    description:'Simple, nourishing one-pot rice and moong dal khichdi — the offering at Buddhist monasteries and temples. Pure, sattvic, and healing.',
    category:'Main Course', religion:'Buddhist', festivals:['Buddha Purnima','Vesak'],
    price:95, cost:35, isVeg:true, prepTime:25, spiceLevel:0, isSpicy:false,
    freeItems:[{name:'Papad',quantity:'2 pieces'},{name:'Ghee',quantity:'1 portion'}],
    image:'/images/khichdi.jpg', tags:['buddhist','veg','prasad','simple','healing'], ingredients:['Rice','Moong Dal','Ghee','Cumin','Turmeric'] }
]

const FESTIVALS = [
  { name:'Eid ul-Fitr',    nameHindi:'ईद उल-फितर',   religion:'Muslim',   description:'Festival marking end of Ramadan fasting month.',  month:4,  emoji:'🌙', color:'#2E7D32', lat:24.8607, lng:67.0011, region:'All India' },
  { name:'Eid ul-Adha',    nameHindi:'ईद उल-अधा',    religion:'Muslim',   description:'Festival of sacrifice — Bakri Eid.',              month:6,  emoji:'🐏', color:'#1B5E20', lat:24.8607, lng:67.0011, region:'All India' },
  { name:'Diwali',         nameHindi:'दीवाली',        religion:'Hindu',    description:'Festival of lights — Lakshmi puja.',              month:10, emoji:'🪔', color:'#FF6F00', lat:26.8467, lng:80.9462, region:'All India' },
  { name:'Ganesh Chaturthi',nameHindi:'गणेश चतुर्थी', religion:'Hindu',   description:"Celebration of Lord Ganesha's birth.",            month:8,  emoji:'🐘', color:'#E65100', lat:18.5204, lng:73.8567, region:'Maharashtra' },
  { name:'Holi',           nameHindi:'होली',           religion:'Hindu',   description:'Festival of colours and spring.',                  month:3,  emoji:'🎨', color:'#FF1744', lat:27.1767, lng:78.0081, region:'North India' },
  { name:'Navratri',       nameHindi:'नवरात्रि',       religion:'Hindu',   description:'Nine nights of Durga worship.',                   month:10, emoji:'💃', color:'#FF6B35', lat:23.0225, lng:72.5714, region:'Gujarat' },
  { name:'Baisakhi',       nameHindi:'बैसाखी',         religion:'Sikh',    description:'Sikh harvest festival and Khalsa founding day.',  month:4,  emoji:'☸️',  color:'#FF6200', lat:31.6340, lng:74.8723, region:'Punjab' },
  { name:'Gurpurab',       nameHindi:'गुरपुरब',        religion:'Sikh',    description:"Celebration of Guru Nanak's birthday.",           month:11, emoji:'🕯️', color:'#BF360C', lat:31.6340, lng:74.8723, region:'Punjab' },
  { name:'Christmas',      nameHindi:'क्रिसमस',        religion:'Christian',description:'Birth of Jesus Christ.',                        month:12, emoji:'⛪', color:'#1565C0', lat:15.2993, lng:74.1240, region:'Goa / Kerala' },
  { name:'Paryushana',     nameHindi:'पर्युषण',        religion:'Jain',    description:'Jain festival of forgiveness and fasting.',       month:8,  emoji:'🙏', color:'#43A047', lat:23.0225, lng:72.5714, region:'Gujarat' },
  { name:'Buddha Purnima', nameHindi:'बुद्ध पूर्णिमा', religion:'Buddhist', description:"Celebrates Buddha's birth, enlightenment & death.", month:5, emoji:'☮️', color:'#FFB300', lat:27.4728, lng:84.9925, region:'Bihar / UP' },
  { name:'Lohri',          nameHindi:'लोहड़ी',          religion:'Sikh',    description:'Winter harvest bonfire festival of Punjab.',      month:1,  emoji:'🔥', color:'#FF6F00', lat:31.6340, lng:74.8723, region:'Punjab' }
]

async function seed() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing in .env')

    await mongoose.connect(process.env.MONGODB_URI)
    logger.info('Connected to MongoDB')

    // Clear existing
    await Promise.all([Food.deleteMany({}), Festival.deleteMany({})])
    logger.info('Cleared existing data')

    // Seed foods
    const foods = await Food.insertMany(FOODS)
    logger.info(`✅ Seeded ${foods.length} foods`)

    // Seed festivals with food references
    const festivalDocs = FESTIVALS.map(f => ({
      ...f,
      foods: foods
        .filter(food => food.festivals.includes(f.name))
        .map(food => food._id)
    }))
    const festivals = await Festival.insertMany(festivalDocs)
    logger.info(`✅ Seeded ${festivals.length} festivals`)

    // Create admin user
    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@apkaswaad.in' })
    if (!existing) {
      await User.create({
        name:         'Admin',
        email:        process.env.ADMIN_EMAIL || 'admin@apkaswaad.in',
        phone:        '+919999999999',
        passwordHash: process.env.ADMIN_PASSWORD || 'Admin@123456',
        role:         'admin',
        emailVerified: true
      })
      logger.info('✅ Admin user created')
    }

    logger.info('🌱 Database seeded successfully!')
    process.exit(0)
  } catch (err) {
    logger.error('Seeding failed:', err)
    process.exit(1)
  }
}

seed()
