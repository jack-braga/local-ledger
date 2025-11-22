import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronUp, ChevronDown, Edit, CheckCircle2, XCircle } from 'lucide-react';
import { Category, CategoryRule, TransactionType, RuleTargetType } from '@/types/finance';
import { toast } from '@/hooks/use-toast';

export default function Categories() {
  const { state, dispatch } = useFinance();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  
  // Category form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#64748b');
  
  // Rule form state
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<'contains' | 'regex'>('contains');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleCaseSensitive, setRuleCaseSensitive] = useState(false);
  const [ruleTargetType, setRuleTargetType] = useState<RuleTargetType>('EXPENSE');
  const [testMatchText, setTestMatchText] = useState('');
  const [testMatchResult, setTestMatchResult] = useState<boolean | null>(null);


  const getCategoryTransactionCount = (categoryId: string) => {
    return state.transactions.filter(t => t.categoryId === categoryId).length;
  };

  const getCategoryTotal = (categoryId: string) => {
    return state.transactions
      .filter(t => t.categoryId === categoryId)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getCategoryRuleCount = (categoryId: string) => {
    return state.rules.filter(r => r.categoryId === categoryId).length;
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color || '#64748b');
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      toast({
        title: 'Validation error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    if (editingCategory) {
      dispatch({
        type: 'UPDATE_CATEGORY',
        id: editingCategory.id,
        updates: {
          name: categoryName.trim(),
          color: categoryColor,
        },
      });
      toast({
        title: 'Category updated',
        description: `${categoryName} has been updated`,
      });
    } else {
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: categoryName.trim(),
        color: categoryColor,
      };
      dispatch({ type: 'ADD_CATEGORY', category: newCategory });
      toast({
        title: 'Category created',
        description: `${categoryName} has been created`,
      });
    }
    setCategoryDialogOpen(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return;

    const ruleCount = getCategoryRuleCount(categoryId);
    const transactionCount = getCategoryTransactionCount(categoryId);

    if (ruleCount > 0 || transactionCount > 0) {
      if (!confirm(`Delete "${category.name}"? This will also delete ${ruleCount} rule(s) and ${transactionCount} transaction(s) will become uncategorized.`)) {
        return;
      }
    }

    dispatch({ type: 'DELETE_CATEGORY', id: categoryId });
    toast({
      title: 'Category deleted',
      description: `${category.name} has been deleted`,
    });
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setRuleCategoryId(state.categories.length > 0 ? state.categories[0].id : '');
    setRuleMatchType('contains');
    setRulePattern('');
    setRuleCaseSensitive(false);
    setRuleTargetType('EXPENSE');
    setTestMatchText('');
    setTestMatchResult(null);
    setRuleDialogOpen(true);
  };

  const handleEditRule = (rule: CategoryRule) => {
    setEditingRule(rule);
    setRuleCategoryId(rule.categoryId);
    setRuleMatchType(rule.matchType);
    setRulePattern(rule.pattern);
    setRuleCaseSensitive(rule.caseSensitive || false);
    setRuleTargetType(rule.targetType);
    setTestMatchText('');
    setTestMatchResult(null);
    setRuleDialogOpen(true);
  };

  const testRuleMatch = (description: string, pattern: string, matchType: 'contains' | 'regex', caseSensitive: boolean): boolean => {
    if (!description || !pattern) return false;

    if (matchType === 'contains') {
      if (caseSensitive) {
        return description.includes(pattern);
      } else {
        return description.toLowerCase().includes(pattern.toLowerCase());
      }
    } else {
      // regex
      try {
        const flags = caseSensitive ? '' : 'i';
        const regex = new RegExp(pattern, flags);
        return regex.test(description);
      } catch {
        return false;
      }
    }
  };


  const validateRulePattern = (): boolean => {
    if (!rulePattern.trim()) return false;
    if (ruleMatchType === 'regex') {
      try {
        const flags = ruleCaseSensitive ? '' : 'i';
        new RegExp(rulePattern, flags);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  };

  const handleSaveRule = () => {
    if (!ruleCategoryId) {
      toast({
        title: 'Validation error',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    if (!rulePattern.trim()) {
      toast({
        title: 'Validation error',
        description: 'Pattern is required',
        variant: 'destructive',
      });
      return;
    }

    if (!validateRulePattern()) {
      toast({
        title: 'Validation error',
        description: 'Invalid regex pattern',
        variant: 'destructive',
      });
      return;
    }

    if (editingRule) {
      dispatch({
        type: 'UPDATE_RULE',
        id: editingRule.id,
        updates: {
          categoryId: ruleCategoryId,
          matchType: ruleMatchType,
          pattern: rulePattern.trim(),
          caseSensitive: ruleCaseSensitive,
          targetType: ruleTargetType,
        },
      });
      toast({
        title: 'Rule updated',
        description: 'Rule has been updated',
      });
    } else {
      const newRule: CategoryRule = {
        id: `rule-${Date.now()}`,
        categoryId: ruleCategoryId,
        matchType: ruleMatchType,
        pattern: rulePattern.trim(),
        caseSensitive: ruleCaseSensitive,
        targetType: ruleTargetType,
      };
      dispatch({ type: 'ADD_RULE', rule: newRule });
      toast({
        title: 'Rule created',
        description: 'Rule has been created',
      });
    }
    setRuleDialogOpen(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    const rule = state.rules.find(r => r.id === ruleId);
    if (!rule) return;

    if (!confirm('Delete this rule?')) return;

    dispatch({ type: 'DELETE_RULE', id: ruleId });
    toast({
      title: 'Rule deleted',
      description: 'Rule has been deleted',
    });
  };

  const handleMoveRule = (ruleId: string, direction: 'up' | 'down') => {
    const currentIndex = state.rules.findIndex(r => r.id === ruleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= state.rules.length) return;

    const newRules = [...state.rules];
    [newRules[currentIndex], newRules[newIndex]] = [newRules[newIndex], newRules[currentIndex]];
    
    dispatch({
      type: 'REORDER_RULES',
      ruleIds: newRules.map(r => r.id),
    });
  };

  const CategoryList = ({ categories }: { categories: Category[] }) => {
    if (categories.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No categories yet.</p>
          <Button onClick={handleCreateCategory} className="mt-4" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const count = getCategoryTransactionCount(category.id);
          const total = getCategoryTotal(category.id);
          const ruleCount = getCategoryRuleCount(category.id);

          return (
            <Card key={category.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color || '#64748b' }}
                    />
                    <CardTitle className="text-base">{category.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold font-mono">
                    ${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{count} transactions</p>
                  <p className="text-xs text-muted-foreground mt-1">{ruleCount} rule{ruleCount !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const RuleManager = () => {
    if (state.rules.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No rules yet. Create rules to automatically categorize transactions.</p>
          <Button onClick={handleCreateRule} className="mt-4" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Rules are matched in order from top to bottom. The first matching rule wins.
          </p>
          <Button onClick={handleCreateRule} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
        <div className="space-y-2">
          {state.rules.map((rule, index) => {
            const category = state.categories.find(c => c.id === rule.categoryId);
            return (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveRule(rule.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveRule(rule.id, 'down')}
                          disabled={index === state.rules.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{rule.matchType === 'contains' ? 'String' : 'Regex'}</Badge>
                          {rule.caseSensitive && <Badge variant="outline" className="text-xs">Case Sensitive</Badge>}
                          <Badge variant="outline" className="text-xs">{rule.targetType}</Badge>
                        </div>
                        <p className="font-mono text-sm">{rule.pattern}</p>
                        {category && (
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: category.color || '#64748b' }}
                            />
                            <span className="text-xs text-muted-foreground">{category.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage transaction categories and rules</p>
        </div>
        <Button onClick={handleCreateCategory}>
          <Plus className="h-4 w-4 mr-2" />
          Create Category
        </Button>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <CategoryList categories={state.categories} />
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <RuleManager />
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Groceries"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="category-color"
                  type="color"
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  placeholder="#64748b"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-category">Category</Label>
              <Select value={ruleCategoryId} onValueChange={setRuleCategoryId}>
                <SelectTrigger id="rule-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {state.categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#64748b' }}
                        />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-target-type">Target Transaction Type</Label>
              <Select value={ruleTargetType} onValueChange={(value) => setRuleTargetType(value as RuleTargetType)}>
                <SelectTrigger id="rule-target-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-match-type">Match Type</Label>
              <Select value={ruleMatchType} onValueChange={(value) => setRuleMatchType(value as 'contains' | 'regex')}>
                <SelectTrigger id="rule-match-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">String Match</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-pattern">Pattern</Label>
              <Input
                id="rule-pattern"
                value={rulePattern}
                onChange={(e) => {
                  setRulePattern(e.target.value);
                  if (testMatchText && e.target.value) {
                    const result = testRuleMatch(testMatchText, e.target.value, ruleMatchType, ruleCaseSensitive);
                    setTestMatchResult(result);
                  } else {
                    setTestMatchResult(null);
                  }
                }}
                placeholder={ruleMatchType === 'contains' ? 'e.g., woolworths' : 'e.g., ^WOOLWORTHS'}
              />
              {ruleMatchType === 'regex' && !validateRulePattern() && rulePattern && (
                <p className="text-xs text-destructive">Invalid regex pattern</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="rule-case-sensitive"
                checked={ruleCaseSensitive}
                onCheckedChange={(checked) => {
                  setRuleCaseSensitive(checked);
                  if (testMatchText && rulePattern) {
                    const result = testRuleMatch(testMatchText, rulePattern, ruleMatchType, checked);
                    setTestMatchResult(result);
                  }
                }}
              />
              <Label htmlFor="rule-case-sensitive">Case Sensitive</Label>
            </div>
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="test-match">Test Match</Label>
              <div className="flex gap-2">
                <Input
                  id="test-match"
                  value={testMatchText}
                  onChange={(e) => {
                    setTestMatchText(e.target.value);
                    if (e.target.value && rulePattern) {
                      const result = testRuleMatch(e.target.value, rulePattern, ruleMatchType, ruleCaseSensitive);
                      setTestMatchResult(result);
                    } else {
                      setTestMatchResult(null);
                    }
                  }}
                  placeholder="Paste a sample transaction description"
                  className="flex-1"
                />
                {testMatchResult !== null && (
                  <div className="flex items-center">
                    {testMatchResult ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {testMatchResult !== null && (
                <p className={`text-xs ${testMatchResult ? 'text-green-600' : 'text-red-600'}`}>
                  {testMatchResult ? 'Match found!' : 'No match'}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={!validateRulePattern()}>
              {editingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
