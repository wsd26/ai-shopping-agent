import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '../store/useUserStore'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  {
    key: 'skinTone',
    title: '你的肤色是？',
    options: [
      { label: '白皙', value: '白皙' },
      { label: '自然偏白', value: '自然偏白' },
      { label: '自然', value: '自然' },
      { label: '小麦色', value: '小麦色' },
      { label: '偏深', value: '偏深' },
    ],
  },
  {
    key: 'budget',
    title: '购物预算区间？',
    options: [
      { label: '100以下', value: [0, 100] },
      { label: '100-300', value: [100, 300] },
      { label: '300-800', value: [300, 800] },
      { label: '800以上', value: [800, 99999] },
    ],
  },
  {
    key: 'concerns',
    title: '你最在意什么？（可多选）',
    options: [
      { label: '性价比', value: '性价比' },
      { label: '品质', value: '品质' },
      { label: '颜值/设计', value: '颜值' },
      { label: '品牌', value: '品牌' },
      { label: '售后服务', value: '售后' },
    ],
  },
  {
    key: 'categories',
    title: '常买哪些品类？（可多选）',
    options: [
      { label: '服装', value: '服装' },
      { label: '美妆护肤', value: '美妆护肤' },
      { label: '配饰包包', value: '配饰' },
      { label: '美食', value: '美食' },
      { label: '数码', value: '数码' },
    ],
  },
]

export default function LandingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [multiSelect, setMultiSelect] = useState<string[]>([])
  const { setPreferences, setOnboardingComplete, hasCompletedOnboarding } = useUserStore()
  const navigate = useNavigate()

  // Use useEffect for redirect instead of calling navigate() during render
  useEffect(() => {
    if (hasCompletedOnboarding) {
      navigate('/live', { replace: true })
    }
  }, [hasCompletedOnboarding, navigate])

  const question = QUESTIONS[step]
  const isMulti = question?.key === 'concerns' || question?.key === 'categories'

  const handleSelect = (value: unknown) => {
    if (isMulti) {
      const current = multiSelect.includes(value as string)
        ? multiSelect.filter((v) => v !== value)
        : [...multiSelect, value as string]
      setMultiSelect(current)
      setAnswers((prev) => ({ ...prev, [question.key]: current }))
    } else {
      const newAnswers = { ...answers, [question.key]: value }
      setAnswers(newAnswers)

      if (step < QUESTIONS.length - 1) {
        setStep(step + 1)
      } else {
        const prefs: Record<string, unknown> = {}
        if (newAnswers.skinTone) prefs.skinTone = newAnswers.skinTone
        if (newAnswers.budget) prefs.budgetRange = newAnswers.budget
        if (newAnswers.concerns) prefs.concerns = newAnswers.concerns
        if (newAnswers.categories) prefs.preferredCategories = newAnswers.categories
        setPreferences(prefs)
        setOnboardingComplete()
        navigate('/live')
      }
    }
  }

  const handleNext = () => {
    if (isMulti && multiSelect.length === 0) return
    const newAnswers = { ...answers, [question.key]: isMulti ? multiSelect : answers[question.key] }

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1)
      setMultiSelect([])
      setAnswers(newAnswers)
    } else {
      const prefs: Record<string, unknown> = {}
      if (newAnswers.skinTone) prefs.skinTone = newAnswers.skinTone
      if (newAnswers.budget) prefs.budgetRange = newAnswers.budget
      if (newAnswers.concerns) prefs.concerns = newAnswers.concerns
      if (newAnswers.categories) prefs.preferredCategories = newAnswers.categories
      setPreferences(prefs)
      setOnboardingComplete()
      navigate('/live')
    }
  }

  const skipAll = () => {
    setOnboardingComplete()
    navigate('/live')
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-950 to-gray-900">
      <div className="w-full max-w-[390px]">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="text-center"
        >
          <div className="text-6xl mb-6">🤖</div>
          <h1 className="text-white text-2xl font-bold mb-2">AI购物助手 · 小快</h1>
          <p className="text-white/40 text-sm mb-10">让我更懂你，为你推荐最适合的好物</p>

          {question && (
            <div className="mb-8">
              <h2 className="text-white text-lg font-medium mb-6">{question.title}</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {question.options.map((opt) => {
                  const isSelected = isMulti
                    ? multiSelect.includes(opt.value as string)
                    : answers[question.key] === opt.value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleSelect(opt.value)}
                      className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-kuaishou-orange text-white shadow-lg shadow-orange-500/20'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            {isMulti && (
              <button
                onClick={handleNext}
                disabled={multiSelect.length === 0}
                className="px-8 py-3 bg-kuaishou-orange text-white rounded-xl font-medium text-sm disabled:opacity-20 transition-opacity"
              >
                下一步
              </button>
            )}
            <button onClick={skipAll} className="px-6 py-3 text-white/30 text-sm hover:text-white/60 transition-colors">
              跳过，直接进入
            </button>
          </div>

          <div className="flex justify-center gap-1.5 mt-8">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-kuaishou-orange w-6' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
