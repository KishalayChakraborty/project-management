'use client';

import { useState, useCallback } from 'react';
import { useMyTasks } from '@/hooks/dashboard/useMyTasks';
import { useFloatingComments } from '@/hooks/useFloatingComments';
import { useGlobalCommentSearch } from '@/hooks/useGlobalCommentSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, X, Search, Loader2 } from 'lucide-react';
import { FloatingCommentBox } from './FloatingCommentBox';

export function FloatingCommentPanel() {
  const { data } = useMyTasks();
  const { boxes, addBox, closeAll } = useFloatingComments();
  const { search: globalSearch, results: searchResults, isLoading: searchLoading } = useGlobalCommentSearch();

  const [showSelector, setShowSelector] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalCommentSearchQuery, setGlobalCommentSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'search'>('tasks');

  const grouped = data?.grouped ?? [];

  // Get available projects for selected org
  const availableProjects = selectedOrg
    ? grouped.find((g) => g.org.id === selectedOrg)?.projects ?? []
    : [];

  // Get available tasks for selected project
  const availableTasks = selectedProject
    ? availableProjects.find((p) => p.project.id === selectedProject)?.tasks ?? []
    : [];

  // Filter tasks by search
  const filteredTasks = availableTasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenComment = (task: typeof availableTasks[0]) => {
    // Check if box already exists
    const existing = boxes.find(
      (b) =>
        b.orgId === selectedOrg &&
        b.projectId === selectedProject &&
        b.taskId === task.id
    );

    if (!existing) {
      const randomX = Math.random() * 200;
      const randomY = 100 + Math.random() * 100;
      addBox({
        orgId: selectedOrg,
        projectId: selectedProject,
        taskId: task.id,
        taskTitle: task.title,
        position: { x: randomX, y: randomY },
        isMinimized: false,
      });
    }
    setShowSelector(false);
  };

  return (
    <>
      {/* Floating Comment Boxes */}
      {boxes.map((box) => (
        <FloatingCommentBox
          key={box.id}
          id={box.id}
          orgId={box.orgId}
          projectId={box.projectId}
          taskId={box.taskId}
          taskTitle={box.taskTitle}
        />
      ))}

      {/* Floating Buttons Container - positioned to avoid overlap with priority panel */}
      <div className="fixed bottom-4 right-20 z-40 flex gap-2 items-end">
        {/* Close All Button */}
        {boxes.length > 0 && !showSelector && (
          <Button
            size="sm"
            variant="outline"
            onClick={closeAll}
            className="text-xs"
          >
            Close All ({boxes.length})
          </Button>
        )}

        {/* Main Comment Button */}
        {!showSelector && (
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg border border-green-500 bg-green-50 hover:bg-green-100 text-green-700"
            onClick={() => setShowSelector(true)}
            title="Open comment box"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}

        {/* Task Selector Popup */}
        {showSelector && (
          <div className="absolute bottom-0 right-0 w-96 bg-background border border-green-500 rounded-lg shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Open Comment</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowSelector(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
              <Button
                variant={activeTab === 'tasks' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-8"
                onClick={() => setActiveTab('tasks')}
              >
                By Task
              </Button>
              <Button
                variant={activeTab === 'search' ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-8"
                onClick={() => setActiveTab('search')}
              >
                Search Comments
              </Button>
            </div>

            {/* Task Selection Tab */}
            {activeTab === 'tasks' && (
              <>
                {/* Organization Select */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Organization
                  </label>
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select org..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grouped.map((org) => (
                        <SelectItem key={org.org.id} value={org.org.id}>
                          {org.org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Select */}
                {selectedOrg && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Project
                    </label>
                    <Select
                      value={selectedProject}
                      onValueChange={setSelectedProject}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjects.map((project) => (
                          <SelectItem
                            key={project.project.id}
                            value={project.project.id}
                          >
                            {project.project.name} ({project.project.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Task Search and Select */}
                {selectedProject && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Task
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-sm pl-7"
                      />
                    </div>

                    {/* Task List */}
                    <div className="max-h-64 overflow-y-auto space-y-1 border rounded p-2">
                      {filteredTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No tasks found
                        </p>
                      ) : (
                        filteredTasks.map((task) => {
                          const isOpen = boxes.some(
                            (b) =>
                              b.taskId === task.id &&
                              b.projectId === selectedProject &&
                              b.orgId === selectedOrg
                          );
                          return (
                            <Button
                              key={task.id}
                              variant={isOpen ? 'secondary' : 'outline'}
                              size="sm"
                              className="w-full justify-start text-xs h-8"
                              onClick={() => handleOpenComment(task)}
                              disabled={isOpen}
                            >
                              <span className="truncate">{task.title}</span>
                              {isOpen && (
                                <span className="ml-auto text-green-600">✓</span>
                              )}
                            </Button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Global Comment Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Search in Comments
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search comments..."
                    value={globalCommentSearchQuery}
                    onChange={(e) => {
                      setGlobalCommentSearchQuery(e.target.value);
                      globalSearch(e.target.value);
                    }}
                    className="h-8 text-sm pl-7"
                  />
                </div>

                {/* Search Results */}
                <div className="max-h-72 overflow-y-auto space-y-2 border rounded p-2">
                  {searchLoading && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Searching...</p>
                    </div>
                  )}
                  {!searchLoading && globalCommentSearchQuery && searchResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No comments found
                    </p>
                  )}
                  {!searchLoading && searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((result) => {
                        const isOpen = boxes.some(
                          (b) =>
                            b.taskId === result.taskId &&
                            b.projectId === result.projectId &&
                            b.orgId === result.orgId
                        );
                        return (
                          <div
                            key={`${result.taskId}-${result.id}`}
                            className="border rounded p-2 hover:bg-muted/30 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground line-clamp-2">
                                    {result.taskTitle}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {result.orgName} • {result.projectCode}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={isOpen ? 'secondary' : 'outline'}
                                  className="h-6 text-xs shrink-0 whitespace-nowrap"
                                  onClick={() => {
                                    handleOpenComment({
                                      id: result.taskId,
                                      title: result.taskTitle,
                                      projectId: result.projectId,
                                    } as any);
                                    // Update selected org and project
                                    setSelectedOrg(result.orgId);
                                    setSelectedProject(result.projectId);
                                  }}
                                  disabled={isOpen}
                                >
                                  {isOpen ? '✓ Open' : 'Open'}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                "{result.content}"
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                by {result.userName || result.userEmail}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!globalCommentSearchQuery && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Type to search across all comments
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
