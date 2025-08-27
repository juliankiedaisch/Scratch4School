from flask import Blueprint, jsonify, request, current_app
from app.models.users import User
from app.models.projects import Project
from app.middlewares.auth import require_auth, require_teacher
from app import db

teacher_bp = Blueprint('teacher', __name__)

@teacher_bp.route('/students', methods=['GET'])
@require_auth
@require_teacher
def get_teacher_students(user_info):
    """Get all students assigned to the authenticated teacher"""
    try:
        # Get teacher's assigned students
        # This implementation assumes you have a teacher_students table
        # that maps teachers to their students
        teacher = User.query.get(user_info['user_id'])
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        # Get students assigned to this teacher
        students = User.query.filter(User.role.in_(["student", "user"])).all()
        
        # Format student data
        student_list = []
        for student in students:
            student_list.append({
                'id': student.id,
                'username': student.username,
                'project_count': Project.query.filter_by(owner_id=student.id).count()
            })
        
        return jsonify({
            'students': student_list,
            'count': len(student_list)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching teacher's students: {str(e)}")
        return jsonify({'error': str(e)}), 500


@teacher_bp.route('/students/<student_id>/projects', methods=['GET'])
@require_auth
@require_teacher
def get_student_projects(user_info, student_id):
    """Get all projects for a specific student"""
    try:
        student = User.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Get projects for this student
        projects = Project.query.filter_by(owner_id=student_id).order_by(Project.updated_at.desc()).all()
        
        # Format project data
        project_list = []
        for project in projects:
            project_list.append({
                'id': project.id,
                'title': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'thumbnail_url': f"/backend/api/projects/{project.id}/thumbnail" if project.thumbnail_path else None
            })
        
        return jsonify({
            'student': {
                'id': student.id,
                'username': student.username,
            },
            'projects': project_list,
            'count': len(project_list)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching student projects: {str(e)}")
        return jsonify({'error': str(e)}), 500