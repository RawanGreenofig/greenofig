import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Users, Search, Filter, MoreVertical, Mail, Shield, Ban,
  UserCheck, Crown, Star, Sparkles, Edit, Trash2, Eye, Key,
  AlertTriangle, Lock, Unlock, RefreshCw, Download, UserPlus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const { t } = useTranslation()
  const { userProfile } = useAuth()
  const isSuperAdmin = userProfile?.role === 'super_admin'

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Dialog states
  const [selectedUser, setSelectedUser] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const [editForm, setEditForm] = useState({ role: '', tier: '', is_active: true })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data with more details
      setUsers([
        { id: '1', full_name: 'Sarah Johnson', email: 'sarah@example.com', role: 'basic_user', tier: 'Premium', is_active: true, created_at: '2024-01-15', last_login: '2024-01-25', stripe_customer_id: 'cus_123', phone: '+1234567890' },
        { id: '2', full_name: 'Mike Chen', email: 'mike@example.com', role: 'basic_user', tier: 'Basic', is_active: true, created_at: '2024-01-10', last_login: '2024-01-24', stripe_customer_id: 'cus_124', phone: null },
        { id: '3', full_name: 'Dr. Emma Wilson', email: 'emma@example.com', role: 'nutritionist', tier: 'Premium', is_active: true, is_verified: true, created_at: '2024-01-05', last_login: '2024-01-25', certifications: 'RD, CDE' },
        { id: '4', full_name: 'John Doe', email: 'john@example.com', role: 'basic_user', tier: 'Free', is_active: false, created_at: '2024-01-01', last_login: '2024-01-10' },
        { id: '5', full_name: 'Admin User', email: 'admin@greenofig.com', role: 'admin', tier: 'Premium', is_active: true, created_at: '2023-12-01', last_login: '2024-01-25' },
        { id: '6', full_name: 'Super Admin', email: 'super@greenofig.com', role: 'super_admin', tier: 'Elite', is_active: true, created_at: '2023-11-01', last_login: '2024-01-25' },
      ])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async () => {
    if (!selectedUser) return

    // Super admin protection - regular admins can't modify super_admin users
    if (!isSuperAdmin && selectedUser.role === 'super_admin') {
      toast.error('You cannot modify super admin users')
      return
    }

    // Admins can't assign super_admin role
    if (!isSuperAdmin && editForm.role === 'super_admin') {
      toast.error('You cannot assign super admin role')
      return
    }

    if (!isSupabaseConfigured()) {
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u))
      toast.success('User updated successfully')
      setEditDialogOpen(false)
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editForm.role,
          tier: editForm.tier,
          is_active: editForm.is_active
        })
        .eq('id', selectedUser.id)

      if (error) throw error

      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u))
      toast.success('User updated successfully')
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Failed to update user')
    }
  }

  const resetPassword = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can reset passwords')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    if (!isSupabaseConfigured()) {
      toast.success(`Password reset for ${selectedUser.email}`)
      setPasswordDialogOpen(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      return
    }

    try {
      // In production, you'd use Supabase Admin API to reset password
      // This requires server-side implementation
      const { error } = await supabase.auth.admin.updateUserById(
        selectedUser.id,
        { password: newPassword }
      )

      if (error) throw error

      toast.success(`Password reset successfully for ${selectedUser.email}`)
      setPasswordDialogOpen(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error('Failed to reset password. Make sure you have admin API access.')
    }
  }

  const sendPasswordResetEmail = async (user) => {
    if (!isSupabaseConfigured()) {
      toast.success(`Password reset email sent to ${user.email}`)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      if (error) throw error
      toast.success(`Password reset email sent to ${user.email}`)
    } catch (error) {
      console.error('Error sending reset email:', error)
      toast.error('Failed to send reset email')
    }
  }

  const toggleUserStatus = async (user) => {
    // Protection checks
    if (!isSuperAdmin && user.role === 'super_admin') {
      toast.error('You cannot modify super admin users')
      return
    }

    const newStatus = !user.is_active

    if (!isSupabaseConfigured()) {
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u))
      toast.success(newStatus ? 'User activated' : 'User deactivated')
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id)

      if (error) throw error

      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u))
      toast.success(newStatus ? 'User activated' : 'User deactivated')
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const deleteUser = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can delete users')
      return
    }

    if (selectedUser.role === 'super_admin') {
      toast.error('Cannot delete super admin users')
      return
    }

    if (!isSupabaseConfigured()) {
      setUsers(users.filter(u => u.id !== selectedUser.id))
      toast.success('User deleted successfully')
      setDeleteDialogOpen(false)
      return
    }

    try {
      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id)

      if (profileError) throw profileError

      // In production, you might also want to delete from auth.users using admin API

      setUsers(users.filter(u => u.id !== selectedUser.id))
      toast.success('User deleted successfully')
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const openEditDialog = (user) => {
    setSelectedUser(user)
    setEditForm({
      role: user.role,
      tier: user.tier,
      is_active: user.is_active
    })
    setEditDialogOpen(true)
  }

  const openPasswordDialog = (user) => {
    setSelectedUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordDialogOpen(true)
  }

  const openViewDialog = (user) => {
    setSelectedUser(user)
    setViewDialogOpen(true)
  }

  const openDeleteDialog = (user) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesTier = tierFilter === 'all' || user.tier === tierFilter
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active)
    return matchesSearch && matchesRole && matchesTier && matchesStatus
  })

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-red-500"><Shield className="w-3 h-3 mr-1" />Super Admin</Badge>
      case 'admin':
        return <Badge className="bg-orange-500"><Shield className="w-3 h-3 mr-1" />Admin</Badge>
      case 'nutritionist':
        return <Badge className="bg-purple-500"><UserCheck className="w-3 h-3 mr-1" />Nutritionist</Badge>
      default:
        return <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />User</Badge>
    }
  }

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Elite':
        return <Badge className="bg-purple-600"><Crown className="w-3 h-3 mr-1" />Elite</Badge>
      case 'Premium':
        return <Badge className="bg-yellow-500 text-black"><Crown className="w-3 h-3 mr-1" />Premium</Badge>
      case 'Basic':
        return <Badge className="bg-blue-500"><Star className="w-3 h-3 mr-1" />Basic</Badge>
      default:
        return <Badge variant="outline"><Sparkles className="w-3 h-3 mr-1" />Free</Badge>
    }
  }

  const canModifyUser = (user) => {
    if (isSuperAdmin) return true
    if (user.role === 'super_admin' || user.role === 'admin') return false
    return true
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? 'Full control over all platform users'
              : 'Manage and view platform users'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {users.length} Total Users
          </Badge>
          {isSuperAdmin && (
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="basic_user">Users</SelectItem>
                <SelectItem value="nutritionist">Nutritionists</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admins</SelectItem>}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Free">Free</SelectItem>
                <SelectItem value="Basic">Basic</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Elite">Elite</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Tier</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Last Login</th>
                  <th className="text-left p-4 font-medium">Joined</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.profile_picture_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">{getTierBadge(user.tier)}</td>
                    <td className="p-4">
                      {user.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewDialog(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canModifyUser(user) && (
                            <>
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sendPasswordResetEmail(user)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Reset Email
                              </DropdownMenuItem>
                            </>
                          )}
                          {/* Super Admin Only Actions */}
                          {isSuperAdmin && user.role !== 'super_admin' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openPasswordDialog(user)}>
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleUserStatus(user)}
                                className={user.is_active ? 'text-orange-500' : 'text-green-500'}
                              >
                                {user.is_active ? (
                                  <><Lock className="mr-2 h-4 w-4" />Deactivate</>
                                ) : (
                                  <><Unlock className="mr-2 h-4 w-4" />Activate</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(user)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                          {/* Admin Actions (limited) */}
                          {!isSuperAdmin && canModifyUser(user) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleUserStatus(user)}
                                className={user.is_active ? 'text-orange-500' : 'text-green-500'}
                              >
                                {user.is_active ? (
                                  <><Ban className="mr-2 h-4 w-4" />Deactivate</>
                                ) : (
                                  <><UserCheck className="mr-2 h-4 w-4" />Activate</>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No users found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {selectedUser.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedUser.full_name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{selectedUser.role?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tier</p>
                  <p className="font-medium">{selectedUser.tier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedUser.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Login</p>
                  <p className="font-medium">{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString() : 'Never'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'Not set'}</p>
                </div>
                {selectedUser.stripe_customer_id && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Stripe Customer</p>
                    <p className="font-medium font-mono text-xs">{selectedUser.stripe_customer_id}</p>
                  </div>
                )}
                {selectedUser.certifications && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Certifications</p>
                    <p className="font-medium">{selectedUser.certifications}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role, tier, and status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({...editForm, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic_user">User</SelectItem>
                  <SelectItem value="nutritionist">Nutritionist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={editForm.tier} onValueChange={(v) => setEditForm({...editForm, tier: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active">Active Account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={updateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog - Super Admin Only */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordError('')
                }}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordError('')
                }}
                placeholder="Confirm new password"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {passwordError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters long.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={resetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedUser?.full_name}</span> ({selectedUser?.email})?
              <br /><br />
              This action cannot be undone. All user data, subscriptions, and history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
