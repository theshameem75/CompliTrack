const toast = document.querySelector('#toast');
const showToast = text => { toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); };

document.querySelector('#assignBtn')?.addEventListener('click', () => showToast('Training assignment flow opened'));
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); document.querySelectorAll('nav a').forEach(item => item.classList.remove('active')); link.classList.add('active');
}));

async function connectDashboard() {
  if (!localStorage.getItem('complitrack.session')) return;
  try {
    const { loadDashboard } = await import('./compliance-service.js');
    const dashboard = await loadDashboard();
    const values = document.querySelectorAll('.stats article strong');
    if (values[1]) values[1].textContent = String(dashboard.assignments.length);
    showToast('Live compliance data connected');
  } catch (error) {
    console.error('Unable to load compliance dashboard', error);
    showToast('Dashboard is using cached summary data');
  }
}

connectDashboard();
