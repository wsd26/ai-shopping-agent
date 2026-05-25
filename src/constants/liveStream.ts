import type { Product } from '../types'
import { mockProducts } from './products'

export interface LiveStreamConfig {
  host: {
    name: string
    avatar: string
    followers: number
    category: string
  }
  productSequence: Product[]
  initialViewerCount: number
}

export const liveStreamConfig: LiveStreamConfig = {
  host: {
    name: '小美精选好物',
    avatar: '👩‍🦰',
    followers: 236000,
    category: '服饰美妆',
  },
  productSequence: [
    mockProducts[0], // dress
    mockProducts[4], // sneaker
    mockProducts[1], // mask
    mockProducts[6], // tshirt
    mockProducts[3], // serum
    mockProducts[2], // bag
    mockProducts[7], // earphone
    mockProducts[5], // jujube
  ],
  initialViewerCount: 2341,
}

export const mockComments = [
  { id: 'c1', user: '小仙女', text: '这个颜色好好看！' },
  { id: 'c2', user: '爱吃的小王', text: '主播身高多少啊' },
  { id: 'c3', user: 'momoko', text: '已拍！期待收货～' },
  { id: 'c4', user: '清风徐来', text: '胖子能穿吗？' },
  { id: 'c5', user: 'lucky666', text: '主播试穿一下粉色' },
  { id: 'c6', user: '快乐生活', text: '买过，质量很好' },
  { id: 'c7', user: '花好月圆', text: '什么时候发优惠券' },
  { id: 'c8', user: '流年似水', text: '我的怎么还没发货' },
  { id: 'c9', user: 'Sunny', text: '关注主播好久了' },
  { id: 'c10', user: '奋斗的小李', text: '这款跟上一款比哪个好' },
  { id: 'c11', user: '茉莉花开', text: '链接在哪里' },
  { id: 'c12', user: '夜空中最亮的星', text: '来了来了' },
  { id: 'c13', user: '平淡才是真', text: '有没有男款' },
  { id: 'c14', user: '猫猫教教主', text: '主播好漂亮' },
  { id: 'c15', user: '追风少年', text: '学生党买得起吗' },
]

export interface LiveComment {
  id: string
  user: string
  text: string
  timestamp: number
}

export function generateComment(): LiveComment {
  return {
    ...mockComments[Math.floor(Math.random() * mockComments.length)],
    timestamp: Date.now(),
  }
}