export const campusOptions = ['All', 'Main Campus', 'BiT', 'EITEX', 'Peda', 'Zenzelma'];

export const departmentTypeOptions = [
  'All',
  'Academic',
  'Administrative',
  'HR Office',
  'Finance Office',
  'Asset Office',
];

export const columns = [
  { key: 'serial', label: 'S No' },
  { key: 'name', label: 'Department Name' },
  { key: 'type', label: 'Department Type' },
  { key: 'campus', label: 'Campus' },
  { key: 'head', label: 'Department Head' },
  { key: 'action', label: 'Action' },
];

export const departments =() =>{
    return (
        <div>
            <button>view</button>
            <button>edit</button>
        </div>
    )
}