'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

type Habit = {
  id: string;
  user_id: string | null;
  title: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<string>('確認中...');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedHabitIds, setCompletedHabitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHabits();
    fetchCompletions();
  }, []);

  const fetchHabits = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('習慣の取得に失敗しました:', error);
        return;
      }

      console.log('✅ 習慣を取得しました:', data);
      setHabits(data || []);
    } catch (err) {
      console.error('予期しないエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompletions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式

      const { data, error } = await supabase
        .from('completion_logs')
        .select('habit_id')
        .eq('completed_date', today);

      if (error) {
        console.error('完了記録の取得に失敗しました:', error);
        return;
      }

      const completedIds = new Set(data?.map(log => log.habit_id) || []);
      setCompletedHabitIds(completedIds);
      console.log('✅ 今日の完了記録:', completedIds);
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  const handleToggleCompletion = async (habitId: string) => {
    const isCompleted = completedHabitIds.has(habitId);
    const today = new Date().toISOString().split('T')[0];

    try {
      if (isCompleted) {
        // 完了記録を削除
        const { error } = await supabase
          .from('completion_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('completed_date', today);

        if (error) {
          console.error('完了記録の削除に失敗しました:', error);
          return;
        }

        // Stateから削除
        const newCompleted = new Set(completedHabitIds);
        newCompleted.delete(habitId);
        setCompletedHabitIds(newCompleted);
        console.log('✅ 完了記録を削除しました');
      } else {
        // 完了記録を追加
        const { error } = await supabase
          .from('completion_logs')
          .insert([
            {
              habit_id: habitId,
              completed_date: today,
              completed_at: new Date().toISOString(),
              memo: null,
            }
          ]);

        if (error) {
          console.error('完了記録の追加に失敗しました:', error);
          return;
        }

        // Stateに追加
        const newCompleted = new Set(completedHabitIds);
        newCompleted.add(habitId);
        setCompletedHabitIds(newCompleted);
        console.log('✅ 完了記録を追加しました');
      }
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  const handleAddHabit = async () => {
    // 空白チェック

    if (!habitTitle.trim()) {
      console.error('習慣名が入力されていません');
      return;
    }

    try {
      // Supabaseに習慣を追加
      const { data, error } = await supabase
        .from('habits')
        .insert([
          {
            title: habitTitle.trim(),
            display_order: 0,
            is_active: true,
          }
        ])
        .select();

      if (error) {
        console.error('習慣の追加に失敗しました:', error);
        alert('習慣の追加に失敗しました。もう一度お試しください。');
        return;
      }

      console.log('✅ 習慣を追加しました:', data);
      alert('習慣を追加しました！');

      await fetchHabits(); //週間一覧を再取得
      // モーダルを閉じて入力をクリア
      setIsModalOpen(false);
      setHabitTitle('');
    } catch (err) {
      console.error('予期しないエラー:', err);
      alert('予期しないエラーが発生しました。');
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* 接続状態の表示 */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-700 text-center">
          <p className="text-sm text-gray-400 mb-1">Supabase接続状態</p>
          <p className="text-lg font-semibold">{connectionStatus}</p>
        </div>

        {/* ヘッダー部分 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            TinySteps
          </h1>
          <p className="text-lg text-gray-400">
            毎日2分の小さな一歩を、確実な習慣に。
          </p>
        </div>

        {/* メインカード */}
        <div className="max-w-2xl mx-auto bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📋</span>
            <h2 className="text-2xl font-semibold">今日の習慣</h2>
          </div>

          <div className="py-8">
            {isLoading ? (
              <p className="text-center text-gray-500">読み込み中...</p>
            ) : habits.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-6">
                  まだ習慣が登録されていません
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
                >
                  <span className="text-xl">+</span>
                  習慣を追加する
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {habits.map((habit) => {
                    const isCompleted = completedHabitIds.has(habit.id);

                    return (
                      <div
                        key={habit.id}
                        className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`habit-${habit.id}`}
                          checked={isCompleted}
                          onChange={() => handleToggleCompletion(habit.id)}
                          className="w-5 h-5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900 cursor-pointer"
                        />
                        <label
                          htmlFor={`habit-${habit.id}`}
                          className={`flex-1 cursor-pointer transition-all ${isCompleted ? 'line-through text-gray-500' : ''
                            }`}
                        >
                          {habit.title}
                        </label>
                        {isCompleted && (
                          <span className="text-emerald-400 text-sm">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-emerald-400 font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span className="text-xl">+</span>
                  習慣を追加する
                </button>
              </>
            )}
          </div>
        </div>

        {/* ヒントセクション */}
        <div className="max-w-2xl mx-auto mt-8 bg-blue-950 bg-opacity-30 border border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">TinyStepsのコツ</h3>
              <p className="text-sm text-gray-400">
                完璧を目指さず、2分だけでもOK！小さな継続が大きな変化を生みます。
              </p>
            </div>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">新しい習慣を追加</h2>

              <div className="mb-6">
                <label htmlFor="habitTitle" className="block text-sm font-medium text-gray-300 mb-2">
                  習慣名（最大50文字）
                </label>
                <input
                  id="habitTitle"
                  type="text"
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  maxLength={50}
                  placeholder="例: スクワット2分"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {habitTitle.length} / 50 文字
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setHabitTitle('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddHabit}
                  disabled={!habitTitle.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}