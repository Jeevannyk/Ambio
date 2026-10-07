import { supabase } from './supabase';

/**
 * Fetch all tasks for a specific user from Supabase.
 */
export async function fetchUserTasks(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[tasksApi] Error fetching user tasks:', error);
    return null;
  }
  return data;
}

/**
 * Insert a new task record in Supabase.
 */
export async function createTaskInDb(userId, task) {
  if (!supabase || !userId) return;
  const row = {
    id: task.id,
    user_id: userId,
    text: task.text,
    done: task.done ?? false,
    list: task.list || 'Personal',
    notes: task.notes || '',
    subtasks: task.subtasks || [],
    tags: task.tags || [],
    reminder: task.reminder || null,
    attachments: task.attachments || [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('tasks').insert(row);
  if (error) {
    console.error('[tasksApi] Error creating task:', error);
  }
}

/**
 * Update an existing task in Supabase.
 */
export async function updateTaskInDb(userId, taskId, patch) {
  if (!supabase || !userId || !taskId) return;
  const updateData = { ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    console.error('[tasksApi] Error updating task:', error);
  }
}

/**
 * Delete a single task from Supabase.
 */
export async function deleteTaskFromDb(userId, taskId) {
  if (!supabase || !userId || !taskId) return;
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    console.error('[tasksApi] Error deleting task:', error);
  }
}

/**
 * Delete multiple tasks from Supabase in bulk.
 */
export async function deleteTasksFromDb(userId, taskIds) {
  if (!supabase || !userId || !taskIds?.length) return;
  const { error } = await supabase
    .from('tasks')
    .delete()
    .in('id', taskIds)
    .eq('user_id', userId);

  if (error) {
    console.error('[tasksApi] Error deleting tasks:', error);
  }
}

/**
 * Migrate local storage tasks to Supabase if Supabase is empty for this user.
 */
export async function migrateLocalTasksToDb(userId, localTasks) {
  if (!supabase || !userId || !localTasks?.length) return;
  const rows = localTasks.map((t) => ({
    id: t.id,
    user_id: userId,
    text: t.text,
    done: t.done ?? false,
    list: t.list || 'Personal',
    notes: t.notes || '',
    subtasks: t.subtasks || [],
    tags: t.tags || [],
    reminder: t.reminder || null,
    attachments: t.attachments || [],
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('[tasksApi] Error migrating local tasks:', error);
  }
}

/**
 * Subscribe to realtime changes on the tasks table for a given user.
 */
export function subscribeToUserTasks(userId, onChange) {
  if (!supabase || !userId) return () => {};
  const channel = supabase
    .channel(`user_tasks_${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
