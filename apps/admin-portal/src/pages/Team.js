import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Engineering as WorkerIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { API_BASE_URL, TOKEN_KEY, USER_KEY } from '../config/constants';

const Team = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Admins state
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [openAdminDialog, setOpenAdminDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  
  // Field workers state
  const [fieldWorkers, setFieldWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [openWorkerDialog, setOpenWorkerDialog] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerForm, setWorkerForm] = useState({
    name: '',
    workerId: '',
    specialization: 'Pothole Repair',
    region: 'North District',
    phone: ''
  });

  // Common UI state
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, name: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formError, setFormError] = useState('');

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const isOwner = currentUser?.role === 'tenant-owner';

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch Admins
  const fetchAdmins = useCallback(async () => {
    if (!isOwner) return;
    setLoadingAdmins(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/team/admins`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load administrators');
      const data = await res.json();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      setLoadingAdmins(false);
    }
  }, [isOwner]);

  // Fetch Field Workers
  const fetchFieldWorkers = useCallback(async () => {
    setLoadingWorkers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/team/field-workers`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load field workers');
      const data = await res.json();
      setFieldWorkers(Array.isArray(data) ? data : []);
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      setLoadingWorkers(false);
    }
  }, []);

  useEffect(() => {
    fetchFieldWorkers();
    if (isOwner) {
      fetchAdmins();
    }
  }, [isOwner, fetchAdmins, fetchFieldWorkers]);

  // Admin Handlers
  const handleOpenAdminDialog = (admin = null) => {
    setFormError('');
    if (admin) {
      setEditingAdmin(admin);
      setAdminForm({ name: admin.name || '', email: admin.email || '', password: '' });
    } else {
      setEditingAdmin(null);
      setAdminForm({ name: '', email: '', password: '' });
    }
    setOpenAdminDialog(true);
  };

  const handleSaveAdmin = async () => {
    setFormError('');
    if (!adminForm.name || !adminForm.email) {
      setFormError('Name and email are required');
      return;
    }
    if (!editingAdmin && !adminForm.password) {
      setFormError('Password is required for new admin');
      return;
    }

    try {
      const url = editingAdmin
        ? `${API_BASE_URL}/admin/team/admins/${editingAdmin._id}`
        : `${API_BASE_URL}/admin/team/admins`;
      const method = editingAdmin ? 'PUT' : 'POST';

      const payload = { ...adminForm };
      if (editingAdmin && !payload.password) delete payload.password;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save admin');

      showSnackbar(editingAdmin ? 'Admin updated successfully' : 'Admin added successfully');
      setOpenAdminDialog(false);
      fetchAdmins();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Field Worker Handlers
  const handleOpenWorkerDialog = (worker = null) => {
    setFormError('');
    if (worker) {
      setEditingWorker(worker);
      setWorkerForm({
        name: worker.name || '',
        workerId: worker.workerId || '',
        specialization: worker.specialization || 'Pothole Repair',
        region: worker.region || 'North District',
        phone: worker.phone || ''
      });
    } else {
      setEditingWorker(null);
      setWorkerForm({
        name: '',
        workerId: `FW-${Math.floor(1000 + Math.random() * 9000)}`,
        specialization: 'Pothole Repair',
        region: 'North District',
        phone: ''
      });
    }
    setOpenWorkerDialog(true);
  };

  const handleSaveWorker = async () => {
    setFormError('');
    if (!workerForm.name || !workerForm.workerId) {
      setFormError('Name and Worker ID are required');
      return;
    }

    try {
      const url = editingWorker
        ? `${API_BASE_URL}/admin/team/field-workers/${editingWorker._id}`
        : `${API_BASE_URL}/admin/team/field-workers`;
      const method = editingWorker ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(workerForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save field worker');

      showSnackbar(editingWorker ? 'Field worker updated successfully' : 'Field worker created successfully');
      setOpenWorkerDialog(false);
      fetchFieldWorkers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    const { type, id } = deleteConfirm;
    try {
      const url = type === 'admin'
        ? `${API_BASE_URL}/admin/team/admins/${id}`
        : `${API_BASE_URL}/admin/team/field-workers/${id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete');

      showSnackbar(`${type === 'admin' ? 'Administrator' : 'Field worker'} deleted successfully`);
      setDeleteConfirm({ open: false, type: '', id: null, name: '' });
      if (type === 'admin') fetchAdmins();
      else fetchFieldWorkers();
    } catch (err) {
      showSnackbar(err.message, 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Team Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your organization's administrators and field workers
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchFieldWorkers();
              if (isOwner) fetchAdmins();
            }}
          >
            Refresh
          </Button>
          {(!isOwner || activeTab === 0) ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenWorkerDialog()}
            >
              Add Field Worker
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenAdminDialog()}
            >
              Add Admin
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<WorkerIcon />} iconPosition="start" label={`Field Workers (${fieldWorkers.length})`} />
          {isOwner && (
            <Tab icon={<AdminIcon />} iconPosition="start" label={`Administrators (${admins.length})`} />
          )}
        </Tabs>
      </Paper>

      {/* Tab 0: Field Workers */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2 }}>
          {loadingWorkers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : fieldWorkers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <WorkerIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No field workers found</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Get started by creating your first field worker.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenWorkerDialog()}>
                Add Field Worker
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell>Worker ID</TableCell>
                    <TableCell>Specialization</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fieldWorkers.map((worker) => (
                    <TableRow key={worker._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            {worker.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{worker.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{worker.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={worker.workerId} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{worker.specialization || 'General Maintenance'}</TableCell>
                      <TableCell>{worker.region || 'Unassigned'}</TableCell>
                      <TableCell>
                        <Chip
                          label={worker.active !== false ? 'Active' : 'Inactive'}
                          color={worker.active !== false ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenWorkerDialog(worker)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteConfirm({ open: true, type: 'worker', id: worker._id, name: worker.name })}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Tab 1: Administrators (Owner Only) */}
      {isOwner && activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          {loadingAdmins ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Administrator</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {admins.map((admin) => {
                    const isSelf = currentUser?._id === admin._id || currentUser?.id === admin._id;
                    return (
                      <TableRow key={admin._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: admin.role === 'tenant-owner' ? 'primary.main' : 'info.main' }}>
                              {admin.name?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {admin.name} {isSelf && '(You)'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {admin.profile?.position || 'Administrator'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={admin.role === 'tenant-owner' ? 'Tenant Owner' : 'Admin'}
                            color={admin.role === 'tenant-owner' ? 'primary' : 'info'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenAdminDialog(admin)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={isSelf}
                            onClick={() => setDeleteConfirm({ open: true, type: 'admin', id: admin._id, name: admin.name })}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Add / Edit Admin Dialog */}
      <Dialog open={openAdminDialog} onClose={() => setOpenAdminDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAdmin ? 'Edit Administrator' : 'Add New Administrator'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={editingAdmin ? 'Password (leave blank to keep unchanged)' : 'Password'}
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                required={!editingAdmin}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdminDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAdmin}>
            {editingAdmin ? 'Save Changes' : 'Create Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Field Worker Dialog */}
      <Dialog open={openWorkerDialog} onClose={() => setOpenWorkerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWorker ? 'Edit Field Worker' : 'Add New Field Worker'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={workerForm.name}
                onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Worker ID"
                value={workerForm.workerId}
                onChange={(e) => setWorkerForm({ ...workerForm, workerId: e.target.value })}
                disabled={!!editingWorker}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Specialization"
                value={workerForm.specialization}
                onChange={(e) => setWorkerForm({ ...workerForm, specialization: e.target.value })}
              >
                <MenuItem value="Pothole Repair">Pothole Repair</MenuItem>
                <MenuItem value="Road Resurfacing">Road Resurfacing</MenuItem>
                <MenuItem value="Crack Sealing">Crack Sealing</MenuItem>
                <MenuItem value="Traffic Sign Maintenance">Traffic Sign Maintenance</MenuItem>
                <MenuItem value="General Inspection">General Inspection</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Region"
                value={workerForm.region}
                onChange={(e) => setWorkerForm({ ...workerForm, region: e.target.value })}
              >
                <MenuItem value="North District">North District</MenuItem>
                <MenuItem value="South District">South District</MenuItem>
                <MenuItem value="East District">East District</MenuItem>
                <MenuItem value="West District">West District</MenuItem>
                <MenuItem value="Central District">Central District</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={workerForm.phone}
                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWorkerDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveWorker}>
            {editingWorker ? 'Save Changes' : 'Create Worker'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Team;
