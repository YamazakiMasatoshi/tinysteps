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
  const [completionMemos, setCompletionMemos] = useState<Map<string, string>>(new Map());
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [currentHabitId, setCurrentHabitId] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyCompletions, setMonthlyCompletions] = useState<Map<string, Set<string>>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateCompletions, setSelectedDateCompletions] = useState<any[]>([]);

  useEffect(() => {
    fetchHabits();
    fetchCompletions();
    fetchMonthlyCompletions(currentMonth);
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
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('completion_logs')
        .select('habit_id, memo')
        .eq('completed_date', today);

      if (error) {
        console.error('完了記録の取得に失敗しました:', error);
        return;
      }

      const completedIds = new Set(data?.map(log => log.habit_id) || []);
      setCompletedHabitIds(completedIds);

      // メモのマップを作成
      const memoMap = new Map(
        data?.map(log => [log.habit_id, log.memo]) || []
      );
      setCompletionMemos(memoMap);

      console.log('✅ 今日の完了記録:', completedIds);
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  const fetchMonthlyCompletions = async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 0-11 → 1-12
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

      // 月の最終日を取得
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('completion_logs')
        .select('habit_id, completed_date')
        .gte('completed_date', startDate)
        .lte('completed_date', endDate);

      if (error) {
        console.error('月間完了記録の取得に失敗しました:', error);
        return;
      }

      // 日付ごとに完了した習慣IDをグループ化
      const completionsMap = new Map<string, Set<string>>();
      data?.forEach(log => {
        if (!completionsMap.has(log.completed_date)) {
          completionsMap.set(log.completed_date, new Set());
        }
        completionsMap.get(log.completed_date)?.add(log.habit_id);
      });

      setMonthlyCompletions(completionsMap);
      console.log('✅ 月間完了記録を取得しました:', completionsMap);
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  const fetchDateCompletions = async (dateStr: string) => {
    try {
      const { data, error } = await supabase
        .from('completion_logs')
        .select(`
          *,
          habits (
            id,
            title
          )
        `)
        .eq('completed_date', dateStr);

      if (error) {
        console.error('日付詳細の取得に失敗しました:', error);
        return;
      }

      setSelectedDateCompletions(data || []);
      setSelectedDate(dateStr);
      console.log('✅ 日付詳細を取得しました:', data);
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0=日曜, 1=月曜, ...
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === day
    );
  };

  const habitColors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
  ];

  const getHabitColor = (habitId: string) => {
    const index = habits.findIndex(h => h.id === habitId);
    return index >= 0 ? habitColors[index % habitColors.length] : 'bg-gray-500';
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    fetchMonthlyCompletions(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    fetchMonthlyCompletions(newMonth);
  };

  const handleToggleCompletion = async (habitId: string) => {
    const isCompleted = completedHabitIds.has(habitId);
    const today = new Date().toISOString().split('T')[0];

    try {
      if (isCompleted) {
        // チェックを外す：完了記録を削除
        const { error } = await supabase
          .from('completion_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('completed_date', today);

        if (error) {
          console.error('完了記録の削除に失敗しました:', error);
          return;
        }

        const newCompleted = new Set(completedHabitIds);
        newCompleted.delete(habitId);
        setCompletedHabitIds(newCompleted);
        console.log('✅ 完了記録を削除しました');
      } else {
        // チェックを入れる：メモ入力モーダルを開く
        setCurrentHabitId(habitId);
        setMemo('');
        setIsMemoModalOpen(true);
      }
    } catch (err) {
      console.error('予期しないエラー:', err);
    }
  };

  const handleSaveMemo = async () => {
    if (!currentHabitId) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('completion_logs')
        .insert([
          {
            habit_id: currentHabitId,
            completed_date: today,
            completed_at: new Date().toISOString(),
            memo: memo.trim() || null,
          }
        ]);

      if (error) {
        console.error('完了記録の追加に失敗しました:', error);
        alert('完了記録の追加に失敗しました。もう一度お試しください。');
        return;
      }

      const newCompleted = new Set(completedHabitIds);
      newCompleted.add(currentHabitId);
      setCompletedHabitIds(newCompleted);

      console.log('✅ 完了記録を追加しました（メモ付き）');

      // モーダルを閉じる
      setIsMemoModalOpen(false);
      setCurrentHabitId(null);
      setMemo('');

      // 完了記録を再取得してメモを表示
      await fetchCompletions();
    } catch (err) {
      console.error('予期しないエラー:', err);
      alert('予期しないエラーが発生しました。');
    }
  };

  const handleDeleteHabit = async (habit: Habit) => {
    const confirmDelete = window.confirm(
      `「${habit.title}」を削除してもよろしいですか？\n\n完了記録も全て削除されます。`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habit.id);

      if (error) {
        console.error('習慣の削除に失敗しました:', error);
        alert('習慣の削除に失敗しました。もう一度お試しください。');
        return;
      }

      console.log('✅ 習慣を削除しました');

      // 習慣一覧を再取得
      await fetchHabits();
      await fetchCompletions();
    } catch (err) {
      console.error('予期しないエラー:', err);
      alert('予期しないエラーが発生しました。');
    }
  };

  // 編集機能
  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setIsEditModalOpen(true);
  };

  const handleUpdateHabit = async () => {
    if (!editingHabit || !editTitle.trim()) {
      alert('習慣名を入力してください。');
      return;
    }

    try {
      const { error } = await supabase
        .from('habits')
        .update({ title: editTitle.trim() })
        .eq('id', editingHabit.id);

      if (error) {
        console.error('習慣の更新に失敗しました:', error);
        alert('習慣の更新に失敗しました。もう一度お試しください。');
        return;
      }

      console.log('✅ 習慣を更新しました');

      // モーダルを閉じる
      setIsEditModalOpen(false);
      setEditingHabit(null);
      setEditTitle('');

      // 習慣一覧を再取得
      await fetchHabits();
    } catch (err) {
      console.error('予期しないエラー:', err);
      alert('予期しないエラーが発生しました。');
    }
  };
  // ここまで追加

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
                    const habitMemo = completionMemos.get(habit.id);

                    return (
                      <div key={habit.id} className="space-y-2">
                        <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
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

                          {/* ここから追加 */}
                          <div className="flex items-center gap-2">
                            {isCompleted && (
                              <span className="text-emerald-400 text-sm">✓</span>
                            )}

                            <button
                              onClick={() => handleEditHabit(habit)}
                              className="p-2 hover:bg-gray-700 rounded transition-colors"
                              title="編集"
                            >
                              <span className="text-lg">✏️</span>
                            </button>

                            <button
                              onClick={() => handleDeleteHabit(habit)}
                              className="p-2 hover:bg-gray-700 rounded transition-colors"
                              title="削除"
                            >
                              <span className="text-lg">🗑️</span>
                            </button>
                          </div>
                          {/* ここまで追加 */}
                        </div>

                        {/* メモの表示 */}
                        {isCompleted && habitMemo && (
                          <div className="ml-12 px-4 py-2 bg-gray-850 rounded-lg border-l-2 border-emerald-500">
                            <div className="flex items-start gap-2">
                              <span className="text-emerald-400 text-sm mt-0.5">💬</span>
                              <p className="text-sm text-gray-300 italic">
                                {habitMemo}
                              </p>
                            </div>
                          </div>
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
                完璧を目指さず、2分だけでもOK！小さな継続が大きな変化を生む。
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

        {isMemoModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-800">
              <h2 className="text-2xl font-bold mb-4">今日の一言メモ</h2>
              <p className="text-sm text-gray-400 mb-6">
                完了した感想や気づきを記録しましょう（任意）
              </p>

              <div className="mb-6">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={200}
                  placeholder="例: 今日は調子が良かった！"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500 resize-none"
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-2">
                  {memo.length} / 200 文字
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsMemoModalOpen(false);
                    setCurrentHabitId(null);
                    setMemo('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveMemo}
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  {memo.trim() ? '保存' : 'メモなしで保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 編集モーダル */}
        {isEditModalOpen && editingHabit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">習慣を編集</h2>

              <div className="mb-6">
                <label htmlFor="editTitle" className="block text-sm font-medium text-gray-300 mb-2">
                  習慣名（最大50文字）
                </label>
                <input
                  id="editTitle"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-emerald-500 text-white"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {editTitle.length} / 50 文字
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingHabit(null);
                    setEditTitle('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateHabit}
                  disabled={!editTitle.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 日付詳細モーダル */}
        {selectedDate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-800 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}の記録
              </h2>

              {selectedDateCompletions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  この日の記録はありません
                </p>
              ) : (
                <div className="space-y-4 mb-6">
                  {selectedDateCompletions.map((completion) => (
                    <div key={completion.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-emerald-400">✓</span>
                        <h3 className="font-semibold">
                          {completion.habits?.title || '削除された習慣'}
                        </h3>
                      </div>
                      {completion.memo && (
                        <div className="ml-6 mt-2 flex items-start gap-2">
                          <span className="text-emerald-400 text-sm">💬</span>
                          <p className="text-sm text-gray-300 italic">
                            {completion.memo}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 ml-6 mt-2">
                        {new Date(completion.completed_at).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}に完了
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedDateCompletions([]);
                }}
                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* カレンダーセクション */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📅</span>
              <h2 className="text-2xl font-semibold">完了カレンダー</h2>
            </div>

            {/* 月の切り替え */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-800 rounded transition-colors"
              >
                <span className="text-2xl">←</span>
              </button>

              <h3 className="text-xl font-semibold">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </h3>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-800 rounded transition-colors"
              >
                <span className="text-2xl">→</span>
              </button>
            </div>

            {/* カレンダーグリッド */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {/* 曜日ヘッダー */}
              {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                <div
                  key={day}
                  className={`text-center font-semibold py-2 ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'
                    }`}
                >
                  {day}
                </div>
              ))}

              {/* 空白セル（月の最初の曜日まで） */}
              {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* 日付セル */}
              {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, index) => {
                const day = index + 1;
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth() + 1;
                const dateStr = formatDate(year, month, day);
                const completedHabits = monthlyCompletions.get(dateStr);
                const hasCompletions = completedHabits && completedHabits.size > 0;
                const today = isToday(year, month, day);

                return (
                  <div
                    key={day}
                    onClick={() => hasCompletions && fetchDateCompletions(dateStr)}
                    className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg
                    ${today ? 'ring-2 ring-blue-500' : ''}
                    ${hasCompletions ? 'bg-emerald-900 bg-opacity-30' : 'bg-gray-800'}
                    ${hasCompletions ? 'hover:bg-opacity-50 cursor-pointer' : ''}
                    transition-all
                  `}
                  >
                    <div className="text-sm">{day}</div>
                    {hasCompletions && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from(completedHabits).slice(0, 3).map((habitId) => (
                          <div
                            key={habitId}
                            className={`w-1.5 h-1.5 rounded-full ${getHabitColor(habitId)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 習慣ごとの統計 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold mb-4">今月の達成状況</h3>
              {habits.map(habit => {
                const completionCount = Array.from(monthlyCompletions.values())
                  .filter(habitIds => habitIds.has(habit.id))
                  .length;

                return (
                  <div key={habit.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getHabitColor(habit.id)}`} />
                      <span>{habit.title}</span>
                    </div>
                    <span className={`font-semibold ${getHabitColor(habit.id).replace('bg-', 'text-')}`}>
                      {completionCount}日完了
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}